import psutil
import time
import platform
import os
import docker
import threading

# Configure psutil to look at host procfs if mapped (for Docker)
# This block is now moved into the SystemMonitor's __init__ for more specific Docker host configuration.
# if "PROCFS_PATH" in os.environ:
#     psutil.PROCFS_PATH = os.environ["PROCFS_PATH"]

class SystemMonitor:
    def __init__(self):
        self.last_net_io = self._get_net_io()
        self.last_net_time = time.time()

        # Configure psutil for Docker on Raspberry Pi
        # This checks for /host/proc and /host/sys, common in Docker environments
        if os.path.exists("/host/proc") and os.path.exists("/host/sys"):
            psutil.PROCFS_PATH = "/host/proc"
            psutil.SYSFS_PATH = "/host/sys"
        # Fallback to environment variable if not in /host context
        elif "PROCFS_PATH" in os.environ:
            psutil.PROCFS_PATH = os.environ["PROCFS_PATH"]

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
        return psutil.cpu_percent(interval=None)

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
            if iface.startswith(('lo', 'docker', 'veth', 'br-', 'dummy')):
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
        if elapsed <= 0:
            return 0.0, 0.0

        sent_diff = current_net_io.bytes_sent - self.last_net_io.bytes_sent
        recv_diff = current_net_io.bytes_recv - self.last_net_io.bytes_recv
        
        # Handle overflow/reset or interface changes
        if sent_diff < 0: sent_diff = 0
        if recv_diff < 0: recv_diff = 0

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

    def collect(self):
        # Prevent "stat stealing" between API calls and DB background loop
        # Only update real stats if some time has passed (e.g., 2 seconds)
        # Otherwise return cached result.
        current_time = time.time()
        
        # Initialize cache if missing
        if not hasattr(self, '_collect_cache'):
            self._collect_cache = None
            self._last_collect_time = 0
            
        # Return cache if fresh enough (protects the delta calculation)
        if self._collect_cache and (current_time - self._last_collect_time < 0.8):
            return self._collect_cache

        upload, download = self.get_network_speed()
        disk = psutil.disk_usage('/')
        
        data = {
            "cpu_usage": self.get_cpu_usage(),
            "ram_usage": self.get_ram_usage(),
            "cpu_temp": self.get_cpu_temp(),
            "disk_usage": self.get_disk_usage(),
            "disk_total_gb": round(disk.total / (1024**3), 2),
            "disk_used_gb": round(disk.used / (1024**3), 2),
            "disk_free_gb": round(disk.free / (1024**3), 2),
            "net_sent_speed": upload,
            "net_recv_speed": download,
            "processes": self.get_process_count(),
            "uptime": self.get_uptime_seconds()
        }
        
        self._collect_cache = data
        self._last_collect_time = current_time
        return data

    def get_containers(self):
        if not self.docker_client:
            return []
        
        containers_data = []
        
        # Ensure lock exists (for thread safety with parallel execution)
        if not hasattr(self, '_container_lock'):
            self._container_lock = threading.Lock()
        if not hasattr(self, '_container_net_cache'):
            self._container_net_cache = {}

        if not hasattr(self, '_collecting_containers'):
            self._collecting_containers = False

        # Concurrency protection: If we are already collecting, skip this turn
        # This prevents piling up Docker requests if they take > 1s
        if self._collecting_containers:
            # print("Skipping container collection (busy)")
            return self._container_stats_cache.get('last_data', [])

        self._collecting_containers = True

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
                        "net_rx": net_rx_total,
                        "net_tx": net_tx_total,
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
                        # print(f"Container processing generated an exception: {exc}")
                        # Append error state instead of missing container
                        containers_data.append({
                            "id": c.short_id, "name": c.name, "state": "error", "error": str(exc),
                            "cpu_percent": 0,"memory_percent": 0,"net_rx": 0,"net_tx": 0,
                            "net_rx_speed": 0,"net_tx_speed": 0
                        })
            
        except Exception as e:
            # print(f"Error listing containers: {e}")
            pass
            
        # Append system services (Tailscale, Cloudflare)
        containers_data.extend(self.get_system_services())
        
        # Cache the result for concurrency fallback
        if not hasattr(self, '_container_stats_cache'):
            self._container_stats_cache = {}
        self._container_stats_cache['last_data'] = containers_data

        self._collecting_containers = False
        return containers_data

    def get_system_services(self):
        """
        Manually scan for specific system services (Tailscale, Cloudflare)
        and format them as 'containers' for the UI.
        """
        services = []
        target_procs = {
            'tailscaled': 'Tailscale', 
            'cloudflared': 'Cloudflare'
        }
        
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

        # Scan processes
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
            try:
                p_name = proc.info['name']
                # Match targets
                matched_name = None
                for t_key, t_display in target_procs.items():
                    if t_key in p_name:
                        matched_name = t_display
                        break
                
                if matched_name:
                    # Collect data
                    mem_usage = proc.info['memory_info'].rss
                    # Mocking totals for now or utilizing interface stats
                    net_rx = ts_rx if matched_name == 'Tailscale' else 0
                    net_tx = ts_tx if matched_name == 'Tailscale' else 0
                    
                    # Calculate speed for Tailscale
                    # We reuse the container cache logic but with a special ID prefix
                    svc_id = f"sys_{proc.info['pid']}"
                    
                    net_rx_speed = 0.0
                    net_tx_speed = 0.0
                    current_time = time.time()
                    
                    # Use existing lock/cache structure from get_containers if possible, 
                    # or just simple diff if we want to be safe. 
                    # Let's reuse the lock for thread safety on the cache dict.
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
                        "id": str(proc.info['pid']), # Use PID as fake ID
                        "name": matched_name,
                        "state": "running", # Process is found, so it's running
                        "cpu_percent": proc.info['cpu_percent'] or 0.0,
                        "memory_usage": mem_usage,
                        "memory_limit": psutil.virtual_memory().total, # Show total system ram as limit
                        "memory_percent": round((mem_usage / psutil.virtual_memory().total) * 100, 2),
                        "net_rx": net_rx,
                        "net_tx": net_tx,
                        "net_rx_speed": net_rx_speed,
                        "net_tx_speed": net_tx_speed
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        return services
