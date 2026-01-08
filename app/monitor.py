import psutil
import time
import platform
import os
import docker
import threading
from datetime import datetime
from .database import ContainerTraffic

# Configure psutil to look at host procfs if mapped (for Docker)
# This block is now moved into the SystemMonitor's __init__ for more specific Docker host configuration.
# if "PROCFS_PATH" in os.environ:
#     psutil.PROCFS_PATH = os.environ["PROCFS_PATH"]

# Configure psutil to look at host procfs if mapped (for Docker)
if os.path.exists("/host/proc") and os.path.exists("/host/sys"):
    psutil.PROCFS_PATH = "/host/proc"
    psutil.SYSFS_PATH = "/host/sys"
# Fallback to environment variable if not in /host context
elif "PROCFS_PATH" in os.environ:
    psutil.PROCFS_PATH = os.environ["PROCFS_PATH"]

class SystemMonitor:
    def __init__(self):
        self.last_net_io = self._get_net_io()
        self.last_net_time = time.time()
        self.alert_cooldowns = {} # metric_level -> timestamp
        
        # Initialize Cache
        self._collect_cache = None
        self._last_collect_time = 0

        # Initialize Docker client
        try:
            self.docker_client = docker.from_env()
            self._container_stats_cache = {}
            self._last_stats_time = {}
        except Exception as e:
            print(f"Docker client init failed: {e}")
            self.docker_client = None
        
        # Prime CPU usage (first call always returns 0)
        try:
            psutil.cpu_percent(interval=None)
        except:
            pass

    def get_cpu_usage(self):
        # Blocking call for 0.5s to get accurate reading
        # This prevents "stuck at 100%" issues with interval=None in some envs
        try:
            return psutil.cpu_percent(interval=0.5)
        except:
            return 0.0

    def get_ram_usage(self):
        return psutil.virtual_memory().percent

    def get_disk_usage(self):
        return psutil.disk_usage('/').percent

    def get_cpu_temp(self):
        """
        Attempts to get CPU temperature. 
        Works on Linux (Raspberry Pi). Returns None on macOS/Windows usually.
        """
        if platform.system() == "Linux":
            try:
                temps = psutil.sensors_temperatures()
                # Common sensor names on Pi: 'cpu_thermal', 'bcm2835_thermal'
                for name in ['cpu_thermal', 'bcm2835_thermal', 'coretemp']:
                    if name in temps:
                        return temps[name][0].current
                # Fallback: return first available temp content if any
                if temps:
                    return list(temps.values())[0][0].current
            except Exception:
                pass
        else:
            # Simulation for macOS/Windows dev so UI isn't empty
            import random
            return 45.0 + random.uniform(-2, 5)
        return None

    def _get_net_io(self):
        """Helper to get filtered network IO (physical interfaces only)"""
        io = psutil.net_io_counters(pernic=True)
        rx = 0
        tx = 0
        for iface, stats in io.items():
            # Filter out virtual interfaces to avoid double counting (Container -> veth -> docker -> eth)
            if iface.startswith(('lo', 'docker', 'veth', 'br-', 'dummy', 'tun', 'tap')):
               continue
            rx += stats.bytes_recv
            tx += stats.bytes_sent
        # Return object compatible with psutil structure
        return type('IO', (), {'bytes_recv': rx, 'bytes_sent': tx})()

    def get_network_speed(self):
        """
        Returns (upload_speed, download_speed) in KB/s since last call.
        """
        current_net_io = self._get_net_io()
        current_time = time.time()
        
        elapsed = current_time - self.last_net_time
        if elapsed <= 0.1: # Prevent division by near-zero time
            return 0.0, 0.0

        sent_diff = current_net_io.bytes_sent - self.last_net_io.bytes_sent
        recv_diff = current_net_io.bytes_recv - self.last_net_io.bytes_recv
        
        # Determine strict sanity threshold (e.g. 2 GB/s is likely impossible for this Pi/Home setup)
        # 2 GB = 2 * 1024 * 1024 * 1024 bytes
        # If difference implies > 2GB/s, it's likely a counter wrap-around or startup spike
        MAX_SPEED_BPS = 2 * 1024 * 1024 * 1024 * elapsed 

        # Handle overflow/reset or interface changes
        if sent_diff < 0 or sent_diff > MAX_SPEED_BPS: sent_diff = 0
        if recv_diff < 0 or recv_diff > MAX_SPEED_BPS: recv_diff = 0

        # Convert to KB/s
        sent_speed = (sent_diff / 1024) / elapsed
        recv_speed = (recv_diff / 1024) / elapsed

        self.last_net_io = current_net_io
        self.last_net_time = current_time

        return sent_speed, recv_speed

    def get_process_count(self):
        return len(psutil.pids())

    def get_uptime_seconds(self):
        return time.time() - psutil.boot_time()

        return sent_speed, recv_speed

    def check_alerts(self, data, db):
        if not db: return

        # Thresholds
        THRESHOLDS = {
            'cpu': {'warning': 80, 'critical': 95},
            'ram': {'warning': 85, 'critical': 95},
            'disk': {'warning': 90, 'critical': 98},
            'temp': {'warning': 75, 'critical': 85}
        }
        
        # Cooldown in seconds (15 minutes)
        COOLDOWN = 900 
        current_time = time.time()
        
        alerts_to_add = []

        def add_alert(metric, value, level, msg_template):
            alert_key = f"{metric}_{level}"
            last_time = self.alert_cooldowns.get(alert_key, 0)
            
            if current_time - last_time > COOLDOWN:
                alerts_to_add.append({
                    "level": level,
                    "message": msg_template.format(value=value)
                })
                self.alert_cooldowns[alert_key] = current_time


        def get_resource_hog(metric_type):
            """Finds the top consumer (container or process) for cpu/ram"""
            try:
                # 1. Check Containers
                containers = self.get_containers(db) # Reuse checks
                top_container = None
                max_val = 0
                
                for c in containers:
                    val = c['cpu_percent'] if metric_type == 'cpu' else c['memory_percent']
                    if val > max_val:
                        max_val = val
                        top_container = c
                
                # 2. Check Host Processes (using psutil) as fallback or comparison
                # Getting top process by CPU/Memory
                # Only check if container usage isn't explaining the load well (e.g. < 50% of load)
                # But for simplicity, let's just return the top container if significant, else top process.
                
                hog_msg = ""
                if top_container and max_val > 10.0: # Only blame container if it's using significant resources
                    hog_msg = f" (En çok: {top_container['name']} %{max_val:.1f})"
                else:
                    # Fallback to psutil processes
                    # Iterate over processes to find top one
                    top_p = None
                    max_p_val = 0
                    try:
                        attrs = ['name', 'cpu_percent'] if metric_type == 'cpu' else ['name', 'memory_percent']
                        for p in psutil.process_iter(['name', 'cpu_percent', 'memory_percent']):
                            try:
                                val = p.info['cpu_percent'] if metric_type == 'cpu' else p.info['memory_percent']
                                if val and val > max_p_val:
                                    max_p_val = val
                                    top_p = p.info['name']
                            except (psutil.NoSuchProcess, psutil.AccessDenied):
                                pass
                        
                        if top_p and max_p_val > 5.0:
                             hog_msg = f" (En çok: {top_p} %{max_p_val:.1f})"
                    except:
                        pass
                
                return hog_msg
            except Exception as e:
                return ""

        # CPU
        if data['cpu_usage'] > THRESHOLDS['cpu']['critical']:
            hog = get_resource_hog('cpu')
            add_alert('cpu', data['cpu_usage'], 'critical', f"CPU kullanımı KRİTİK seviyede: %{{value}}{hog}")
        elif data['cpu_usage'] > THRESHOLDS['cpu']['warning']:
            hog = get_resource_hog('cpu')
            add_alert('cpu', data['cpu_usage'], 'warning', f"CPU kullanımı yüksek: %{{value}}{hog}")

        # RAM
        if data['ram_usage'] > THRESHOLDS['ram']['critical']:
             hog = get_resource_hog('ram')
             add_alert('ram', data['ram_usage'], 'critical', f"RAM kullanımı KRİTİK seviyede: %{{value}}{hog}")
        elif data['ram_usage'] > THRESHOLDS['ram']['warning']:
             hog = get_resource_hog('ram')
             add_alert('ram', data['ram_usage'], 'warning', f"RAM kullanımı yüksek: %{{value}}{hog}")

        # Disk
        if data['disk_usage'] > THRESHOLDS['disk']['critical']:
             add_alert('disk', data['disk_usage'], 'critical', "Disk alanı TÜKENİYOR: %{value}")
        elif data['disk_usage'] > THRESHOLDS['disk']['warning']:
             add_alert('disk', data['disk_usage'], 'warning', "Disk doluluk oranı yüksek: %{value}")
             
        # Temp
        if data.get('cpu_temp') and data['cpu_temp'] > THRESHOLDS['temp']['critical']:
             add_alert('temp', data['cpu_temp'], 'critical', "İşlemci sıcaklığı KRİTİK: {value}°C")
        elif data.get('cpu_temp') and data['cpu_temp'] > THRESHOLDS['temp']['warning']:
             add_alert('temp', data['cpu_temp'], 'warning', "İşlemci ısınıyor: {value}°C")

        # Network Upload (Threshold: ~5 MB/s = 5120 KB/s based on user's 60mbps limit)
        # We use a slightly lower threshold to catch spikes before saturation
        UPLOAD_LIMIT_KB = 5120 
        
        if data['net_sent_speed'] > UPLOAD_LIMIT_KB:
            # Find the network hog
            try:
                containers = self.get_containers(db)
                top_c = None
                max_tx = 0
                
                for c in containers:
                    # c['net_tx_speed'] is Bytes/s, convert to KB/s
                    tx_kb = c.get('net_tx_speed', 0) / 1024
                    if tx_kb > max_tx:
                        max_tx = tx_kb
                        top_c = c
                
                msg = "Yüksek Upload Hızı: {value:.1f} MB/s"
                val_mb = data['net_sent_speed'] / 1024
                
                # If a container accounts for > 50% of the traffic
                if top_c and max_tx > (data['net_sent_speed'] * 0.5):
                    hog_val_mb = max_tx / 1024
                    msg += f" ({top_c['name']} {hog_val_mb:.1f} MB/s)"
                
                add_alert('net_up', val_mb, 'warning', msg)
                
            except Exception:
                pass

        # Save to DB
        if alerts_to_add:
            from app.database import Alert
            for alert in alerts_to_add:
                db_alert = Alert(level=alert['level'], message=alert['message'])
                db.add(db_alert)
            try:
                db.commit()
            except:
                db.rollback()

    def collect(self, db=None):
        # Prevent "stat stealing" between API calls and DB background loop
        # Only update real stats if some time has passed (e.g., 2 seconds)
        # Otherwise return cached result.
        current_time = time.time()
        
        if self._collect_cache and (current_time - self._last_collect_time < 2.0):
            return self._collect_cache

        upload, download = self.get_network_speed()
        disk = psutil.disk_usage('/')
        
        data = {
            "cpu_usage": self.get_cpu_usage(),
            "ram_usage": self.get_ram_usage(),
            "disk_usage": disk.percent,
            "disk_total_gb": round(disk.total / (1024**3), 2),
            "disk_used_gb": round(disk.used / (1024**3), 2),
            "disk_free_gb": round(disk.free / (1024**3), 2),
            "net_sent_speed": upload,
            "net_recv_speed": download,
            "cpu_temp": self.get_cpu_temp(),
            "uptime": self.get_uptime_seconds(),
            "timestamp": datetime.now().isoformat()
        }
        
        # Check alerts (pass db session)
        if db:
            self.check_alerts(data, db)

        self._collect_cache = data
        self._last_collect_time = current_time
        return data

    def get_containers(self, db=None):
        if not self.docker_client:
            return []
        
        containers_data = []
        
        # Ensure lock exists (for thread safety with parallel execution)
        if not hasattr(self, '_container_lock'):
            self._container_lock = threading.Lock()
        if not hasattr(self, '_container_net_cache'):
            self._container_net_cache = {}

        try:
            containers = self.docker_client.containers.list()
            current_time = time.time()
            
            # Helper function to process a single container
            def process_container(container):
                try:
                    # Get stats (stream=False to get just one snapshot)
                    stats = container.stats(stream=False)
                    
                    # Calculate CPU %
                    cpu_percent = 0.0
                    if 'cpu_stats' in stats and 'precpu_stats' in stats:
                        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                                    stats['precpu_stats']['cpu_usage']['total_usage']
                        
                        system_cpu_delta = stats['cpu_stats']['system_cpu_usage'] - \
                                            stats['precpu_stats']['system_cpu_usage']

                        # Normalize CPU percentage (0-100% System Total)
                        if system_cpu_delta > 0 and cpu_delta > 0:
                            cpu_percent = (cpu_delta / system_cpu_delta) * 100.0

                    # Calculate Memory
                    mem_usage = 0
                    mem_limit = 0
                    mem_percent = 0.0
                    
                    if 'memory_stats' in stats:
                        mem_usage = stats['memory_stats'].get('usage', 0)
                        mem_limit = stats['memory_stats'].get('limit', 1)
                        if mem_limit > 0:
                            mem_percent = (mem_usage / mem_limit) * 100.0

                    # Network I/O
                    net_rx_total = 0
                    net_tx_total = 0
                    
                    # DEBUG: Log network presence
                    if 'networks' in stats:
                        for iface in stats['networks']:
                            net_rx_total += stats['networks'][iface]['rx_bytes']
                            net_tx_total += stats['networks'][iface]['tx_bytes']

                    # Calculate Network Speed
                    # We need to lock while reading/writing the shared cache
                    net_rx_speed = 0.0
                    net_tx_speed = 0.0
                    
                    with self._container_lock:
                        cid = container.id
                        if cid in self._container_net_cache:
                            last_stat = self._container_net_cache[cid]
                            time_diff = current_time - last_stat['time']
                            if time_diff > 0:
                                rx_diff = net_rx_total - last_stat['rx']
                                tx_diff = net_tx_total - last_stat['tx']
                                # Handle resets/overflows
                                if rx_diff < 0: rx_diff = 0
                                if tx_diff < 0: tx_diff = 0
                                
                                net_rx_speed = rx_diff / time_diff # Bytes/s
                                net_tx_speed = tx_diff / time_diff # Bytes/s
                        
                        # Update cache
                        self._container_net_cache[cid] = {
                            'rx': net_rx_total, 
                            'tx': net_tx_total, 
                            'time': current_time
                        }

                    return {
                        "id": container.short_id,
                        "name": container.name,
                        "state": container.status,
                        "cpu_percent": round(cpu_percent, 2),
                        "memory_usage": mem_usage,
                        "memory_limit": mem_limit,
                        "memory_percent": round(mem_percent, 2),
                        "net_rx": net_rx_total, # Raw Docker value (processed later)
                        "net_tx": net_tx_total, # Raw Docker value (processed later)
                        "net_rx_speed": net_rx_speed, # Bytes/s
                        "net_tx_speed": net_tx_speed  # Bytes/s
                    }
                except Exception as e:
                    # print(f"Error getting stats for {container.name}: {e}")
                    return {
                        "id": container.short_id,
                        "name": container.name,
                        "state": container.status,
                        "cpu_percent": 0.0,
                        "memory_usage": 0,
                        "memory_limit": 0,
                        "memory_percent": 0.0,
                        "net_rx": 0,
                        "net_tx": 0,
                        "net_rx_speed": 0,
                        "net_tx_speed": 0,
                        "error": str(e)
                    }

            # Use ThreadPoolExecutor for parallel processing (Revised for stability)
            # Using 'submit' + 'as_completed' is safer than 'map' for handling individual failures
            import concurrent.futures
            
            containers_data = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor: # Limit workers to prevent overload
                future_to_container = {executor.submit(process_container, c): c for c in containers}
                
                for future in concurrent.futures.as_completed(future_to_container):
                    c = future_to_container[future]
                    try:
                        data = future.result()
                        containers_data.append(data)
                    except Exception as exc:
                        print(f"Container processing generated an exception: {exc}")
                        # Append error state instead of missing container
                        containers_data.append({
                            "id": c.short_id, "name": c.name, "state": "error", "error": str(exc),
                            "cpu_percent": 0,"memory_percent": 0,"net_rx": 0,"net_tx": 0,
                            "net_rx_speed": 0,"net_tx_speed": 0
                        })
            
        except Exception as e:
            print(f"Error listing containers: {e}")
        
        # Always get system services
        system_services = self.get_system_services()
        if system_services:
            containers_data.extend(system_services)
            
        # --- POST-PROCESSING: PERSISTENCE (SEQUENTIAL) ---
        # Perform DB operations here in the main thread to avoid SQLite locking issues
        if db and containers_data:
            for c in containers_data:
                     # Only persist for real containers (skip system services if needed)
                     # Assuming system services also need persistence they would need Name logic
                     # But for now let's focus on Docker containers which have 'net_rx' raw fields
                    try:
                        name = c.get('name')
                        net_rx_total = c.get('net_rx', 0)
                        net_tx_total = c.get('net_tx', 0)
                        
                        # Get or create record
                        record = db.query(ContainerTraffic).filter(ContainerTraffic.name == name).first()
                        if not record:
                            record = ContainerTraffic(
                                name=name,
                                total_rx=net_rx_total,
                                total_tx=net_tx_total,
                                last_docker_rx=net_rx_total,
                                last_docker_tx=net_tx_total
                            )
                            db.add(record)
                            # db.commit() deferred
                        else:
                            # Calculate Delta
                            delta_rx = net_rx_total - record.last_docker_rx
                            delta_tx = net_tx_total - record.last_docker_tx
                            
                            # Detect Reset
                            if net_rx_total < record.last_docker_rx:
                                delta_rx = net_rx_total
                            if net_tx_total < record.last_docker_tx:
                                delta_tx = net_tx_total

                            if delta_rx < 0: delta_rx = 0
                            if delta_tx < 0: delta_tx = 0
                            
                            # Update Total
                            record.total_rx += delta_rx
                            record.total_tx += delta_tx
                            
                            # Update Reference
                            record.last_docker_rx = net_rx_total
                            record.last_docker_tx = net_tx_total
                            
                            # db.commit() deferred
                            
                            # Update Display Value to Persisted Total
                            c['net_rx'] = record.total_rx
                            c['net_tx'] = record.total_tx

                    except Exception as e:
                       # print(f"Persistence Error for {name}: {e}")
                       pass
            
            try:
                db.commit()
            except Exception as e:
                # print(f"Commit Error: {e}")
                db.rollback()
        
        return containers_data

    def get_system_services(self):
        """
        Manually scan for specific system services (Tailscale, Cloudflare)
        and format them as 'containers' for the UI.
        Optimization: Only scan full process list every 30 seconds.
        """
        services = []
        target_procs = {
            'tailscaled': 'Tailscale', 
            'cloudflared': 'Cloudflare'
        }
        
        # Initialize cache for process PIDs
        if not hasattr(self, '_service_pid_cache'):
            self._service_pid_cache = {}
            self._last_service_scan = 0
            
        current_time = time.time()
        
        # Full scan every 30 seconds to find new/restarted processes
        if current_time - self._last_service_scan > 30.0:
            self._service_pid_cache = {} # Clear old cache
            try:
                # Scan all processes
                for proc in psutil.process_iter(['pid', 'name']):
                    try:
                        p_name = proc.info['name']
                        for t_key, t_display in target_procs.items():
                            if t_key in p_name:
                                # Found a target service, store PID and Display Name
                                self._service_pid_cache[proc.pid] = t_display
                                break
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                self._last_service_scan = current_time
            except Exception as e:
                print(f"Service scan error: {e}")

        # Fetch stats for cached PIDs (Lightweight operation)
        # Network stats for Tailscale interface
        ts_rx = 0
        ts_tx = 0
        try:
            net_io = psutil.net_io_counters(pernic=True)
            if 'tailscale0' in net_io:
                ts_rx = net_io['tailscale0'].bytes_recv
                ts_tx = net_io['tailscale0'].bytes_sent
        except:
            pass

        for pid, matched_name in self._service_pid_cache.items():
            try:
                proc = psutil.Process(pid)
                # Get fresh stats
                with proc.oneshot():
                    cpu = proc.cpu_percent()
                    mem = proc.memory_info().rss
                
                # Mocking totals for now or utilizing interface stats
                net_rx = ts_rx if matched_name == 'Tailscale' else 0
                net_tx = ts_tx if matched_name == 'Tailscale' else 0
                
                # Calculate speed for Tailscale
                svc_id = f"sys_{pid}"
                net_rx_speed = 0.0
                net_tx_speed = 0.0
                
                if hasattr(self, '_container_lock'):
                    with self._container_lock:
                        if svc_id in self._container_net_cache:
                            last = self._container_net_cache[svc_id]
                            t_diff = current_time - last['time']
                            if t_diff > 0:
                                net_rx_speed = max(0, (net_rx - last['rx']) / t_diff)
                                net_tx_speed = max(0, (net_tx - last['tx']) / t_diff)
                        
                        self._container_net_cache[svc_id] = {
                            'rx': net_rx, 'tx': net_tx, 'time': current_time
                        }

                services.append({
                    "id": str(pid),
                    "name": matched_name,
                    "state": "running",
                    "cpu_percent": cpu or 0.0,
                    "memory_usage": mem,
                    "memory_limit": psutil.virtual_memory().total,
                    "memory_percent": round((mem / psutil.virtual_memory().total) * 100, 2),
                    "net_rx": net_rx,
                    "net_tx": net_tx,
                    "net_rx_speed": net_rx_speed,
                    "net_tx_speed": net_tx_speed
                })
            except (psutil.NoSuchProcess, psutil.ZombieProcess):
                # Process died, will be removed from cache on next full scan
                pass
            except Exception:
                pass
        
        return services
