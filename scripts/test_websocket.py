#!/usr/bin/env python3

import websocket
import json
import time
import threading

def on_message(ws, message):
    print(f"📨 Received message: {message}")
    try:
        data = json.loads(message)
        print(f"   Event Type: {data.get('type', 'unknown')}")
        print(f"   Data: {json.dumps(data.get('data', {}), indent=2)}")
    except:
        pass

def on_error(ws, error):
    print(f"❌ Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("🔌 WebSocket connection closed")

def on_open(ws):
    print("✅ WebSocket connection established!")
    print("⏳ Waiting for events...\n")
    
    def close_after_delay():
        time.sleep(5)
        print("\n✅ WebSocket test completed successfully")
        ws.close()
    
    threading.Thread(target=close_after_delay).start()

if __name__ == "__main__":
    print("🔌 Testing WebSocket Connection...")
    print("Connecting to: ws://localhost:3000/ws\n")
    
    ws = websocket.WebSocketApp("ws://localhost:3000/ws",
                              on_open=on_open,
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close)
    
    ws.run_forever()
