
import docker
import time
import json

def debug_network():
    print("--- Docker Network Stats Debugger ---")
    try:
        client = docker.from_env()
        containers = client.containers.list()
        
        if not containers:
            print("No running containers found.")
            return

        print(f"Found {len(containers)} containers. Monitoring usage for 5 seconds...")
        
        # Find a container likely to have traffic (nextcloud or just the first one)
        target = next((c for c in containers if 'nextcloud' in c.name), containers[0])
        print(f"Target Container: {target.name} ({target.short_id})")

        last_rx = 0
        last_tx = 0
        
        for i in range(6):
            stats = target.stats(stream=False)
            
            rx = 0
            tx = 0
            
            # Inspect networks structure
            networks = stats.get('networks', {})
            if not networks:
                print(f"Moment {i}: 'networks' key is empty or missing! Stats keys: {list(stats.keys())}")
            
            for iface, data in networks.items():
                rx += data['rx_bytes']
                tx += data['tx_bytes']
                # Print raw iface data for first run
                if i == 0:
                    print(f"  Interface [{iface}]: RX={data['rx_bytes']}, TX={data['tx_bytes']}")

            if i > 0:
                rx_delta = rx - last_rx
                tx_delta = tx - last_tx
                print(f"Moment {i}: Total RX={rx} (+{rx_delta}), Total TX={tx} (+{tx_delta})")
            else:
                print(f"Moment {i}: Total RX={rx}, Total TX={tx} (Baseline)")

            last_rx = rx
            last_tx = tx
            time.sleep(1)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_network()
