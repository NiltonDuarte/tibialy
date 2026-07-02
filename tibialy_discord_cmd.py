import sys
import time
import subprocess
from datetime import datetime

# -------------------------------------------------------------------------
# OS STRATEGY INTERFACES & IMPLEMENTATIONS
# -------------------------------------------------------------------------

class WindowsAutomation:
    """Handles low-level OS tasks specifically for Microsoft Windows."""
    def __init__(self):
        import ctypes
        self.ctypes = ctypes

    def prevent_sleep(self):
        ES_CONTINUOUS = 0x80000000
        ES_SYSTEM_REQUIRED = 0x00000001
        ES_DISPLAY_REQUIRED = 0x00000002
        self.ctypes.windll.kernel32.SetThreadExecutionState(
            ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
        )

    def allow_sleep(self):
        ES_CONTINUOUS = 0x80000000
        self.ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS)

    def copy_to_clipboard(self, text):
        subprocess.run("clip", input=text.encode("utf-8"), check=True, shell=True)

    def perform_paste(self):
        VK_CONTROL = 0x11
        V_KEY = 0x56
        self.ctypes.windll.user32.keybd_event(VK_CONTROL, 0, 0, 0)
        self.ctypes.windll.user32.keybd_event(V_KEY, 0, 0, 0)
        time.sleep(0.05)
        self.ctypes.windll.user32.keybd_event(V_KEY, 0, 2, 0)
        self.ctypes.windll.user32.keybd_event(VK_CONTROL, 0, 2, 0)

    def press_enter(self):
        VK_RETURN = 0x0D
        self.ctypes.windll.user32.keybd_event(VK_RETURN, 0, 0, 0)
        time.sleep(0.05)
        self.ctypes.windll.user32.keybd_event(VK_RETURN, 0, 2, 0)


class MacAutomation:
    """Handles OS tasks for macOS with microsecond execution speeds using CoreGraphics APIs."""
    def __init__(self):
        self.caffeinate_process = None
        import ctypes
        self.ctypes = ctypes
        
        # Load the CoreGraphics framework directly into memory to eliminate process fork lag
        self.cg = ctypes.CDLL("/System/Library/Frameworks/ApplicationServices.framework/Frameworks/CoreGraphics.framework/CoreGraphics")

    def prevent_sleep(self):
        self.caffeinate_process = subprocess.Popen(["caffeinate", "-di"])

    def allow_sleep(self):
        if self.caffeinate_process:
            self.caffeinate_process.terminate()

    def copy_to_clipboard(self, text):
        subprocess.run("pbcopy", input=text.encode("utf-8"), check=True)

    def _send_native_key(self, key_code):
        """Dispatches an instantaneous low-level physical keystroke bypassing AppleScript."""
        event_down = self.cg.CGEventCreateKeyboardEvent(None, key_code, True)
        event_up = self.cg.CGEventCreateKeyboardEvent(None, key_code, False)
        
        # 0 = kCGHIDEventTap (system level hardware event stream)
        self.cg.CGEventPost(0, event_down)
        time.sleep(0.01) # Small hardware delay between press and release
        self.cg.CGEventPost(0, event_up)
        
        # Clean up Core Foundation pointers in memory
        self.ctypes.CDLL("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation").CFRelease(event_down)
        self.ctypes.CDLL("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation").CFRelease(event_up)

    def perform_paste(self):
        # Fired at T-2 seconds, so sub-millisecond overhead is perfectly fine here
        cmd = """osascript -e 'tell application "System Events" to keystroke "v" using {command down}'"""
        subprocess.run(cmd, shell=True)

    def press_enter(self):
        # Virtual Key Code for Enter/Return on a Mac keyboard is 36
        self._send_native_key(36)


# -------------------------------------------------------------------------
# CORE AUTOMATION ENGINE (Accepts injected OS Handler)
# -------------------------------------------------------------------------

def run_scheduler(message, os_handler):
    # Target TODAY at 09:59:56.700 AM
    now = datetime.now()
    target_time = datetime(now.year, now.month, now.day, 9, 59, 56, 700000)
    
    target_timestamp = target_time.timestamp()
    paste_timestamp = target_timestamp - 2.0
    countdown_stop_timestamp = target_timestamp - 1.0
    
    if time.time() > target_timestamp:
        print(f"Error: The target time ({target_time.strftime('%H:%M:%S.%f')[:-3]}) has already passed today!")
        return

    print("\nCRITICAL: Click inside your Discord chat box NOW and leave it focused!")
    print("-" * 50)
    
    # 1. Turn on sleep prevention
    os_handler.prevent_sleep()

    try:
        # 2. PHASE 1: Countdown until T-2 Seconds
        while True:
            current_time = time.time()
            if current_time >= paste_timestamp:
                break
            
            remaining = target_timestamp - current_time
            print(f"Time remaining: {remaining:.1f}s | Status: Waiting... Clipboard is free! ", end='\r', flush=True)
            time.sleep(0.1)
            
        # 3. AT T-2 SECONDS: Copy & Paste
        print(f"\n[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] T-2.0s reached!")
        
        print("Injected Handler: Copying text to clipboard...")
        os_handler.copy_to_clipboard(message)
        
        print("Injected Handler: Pasting message into Discord...")
        os_handler.perform_paste()
        
        # 4. PHASE 2: Countdown from T-2 to T-1 Second
        while True:
            current_time = time.time()
            if current_time >= countdown_stop_timestamp:
                break
                
            remaining = target_timestamp - current_time
            print(f"Time remaining: {remaining:.1f}s | Status: Message pasted! Readying Enter...                 ", end='\r', flush=True)
            time.sleep(0.05)

        # 5. AT T-1 SECOND: Freeze UI updates for absolute precision
        print(f"\n[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] T-1.0s reached. Freezing console for engine precision...")
        
        # 6. PHASE 3: High-precision micro-sleep for the final 1.000 second
        while time.time() < target_timestamp:
            time.sleep(0.001)
            
        # 7. AT EXACT TARGET: Press Enter
        os_handler.press_enter()
        print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] TARGET HIT! Enter keystroke sent!")

    finally:
        # 8. Restore normal OS sleep behavior
        os_handler.allow_sleep()


# -------------------------------------------------------------------------
# RUNTIME FACTORY / INITIALIZATION
# -------------------------------------------------------------------------

if __name__ == "__main__":
    print("--- Object-Oriented Precision Scheduler ---\n")

    # 1. Resolve which OS class to instantiate
    if sys.platform == "win32":
        handler = WindowsAutomation()
    elif sys.platform == "darwin":
        handler = MacAutomation()
    else:
        print(f"Error: Unsupported Operating System ({sys.platform}).")
        sys.exit()

    # 2. Get user's desired text payload
    message_payload = input("Enter the message to send: ")

    # 3. Inject the handler directly into the execution engine
    run_scheduler(message_payload, handler)
