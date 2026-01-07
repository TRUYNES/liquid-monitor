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
        upload, download = self.get_network_speed()
        disk = psutil.disk_usage('/')
        return {
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

    def get_containers(self):
        if not self.docker_client:
            return []
        
        containers_data = []
        try:
            containers = self.docker_client.containers.list()
            
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
                    net_rx = 0
                    net_tx = 0
                    if 'networks' in stats:
                        for iface in stats['networks']:
                            net_rx += stats['networks'][iface]['rx_bytes']
                            net_tx += stats['networks'][iface]['tx_bytes']

                    return {
                        "id": container.short_id,
                        "name": container.name,
                        "state": container.status,
                        "cpu_percent": round(cpu_percent, 2),
                        "memory_usage": mem_usage,
                        "memory_limit": mem_limit,
                        "memory_percent": round(mem_percent, 2),
                        "net_rx": net_rx,
                        "net_tx": net_tx
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
                        "error": str(e)
                    }

            # Use ThreadPoolExecutor for parallel processing
            # 29 containers sequentially takes ~3-5s. Parallel takes <1s.
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                results = list(executor.map(process_container, containers))
            
            containers_data = results

        except Exception as e:
            print(f"Error listing containers: {e}")
            
        return containers_data
