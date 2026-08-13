# Hardware Setup

1. Connect the USB arcade button encoder to the Windows mini PC.
2. Windows should recognize it automatically as a standard HID keyboard
   (no driver install required).
3. Launch the app, open Admin (`CTRL+SHIFT+A`) → **TEST BUTTON**, press
   the physical button.
4. Confirm "USB BUTTON DETECTED ✓" appears with the expected key code
   (default `SPACE`).
5. If no detection:
   - Try a different USB port.
   - Confirm the encoder's DIP/config switches are set to
     keyboard-emulation mode (see encoder manufacturer docs).
   - Confirm a plain USB keyboard's `SPACE` key is detected via the same
     **TEST BUTTON** screen, as a sanity check that the app's input
     handling itself is working correctly.
