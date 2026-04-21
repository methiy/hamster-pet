use serde::Serialize;
use std::sync::atomic::{AtomicIsize, Ordering};

/// Stored HWND from capture_foreground_hwnd, used by move_captured_window
static CAPTURED_HWND: AtomicIsize = AtomicIsize::new(0);

#[derive(Debug, Serialize, Clone)]
pub struct ActiveWindowInfo {
    pub title: String,
    pub process_name: String,
    pub rect: WindowRect,
}

#[derive(Debug, Serialize, Clone)]
pub struct WindowRect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

#[derive(Debug, Serialize, Clone)]
pub struct IdleInfo {
    pub idle_seconds: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct CursorPosition {
    pub x: i32,
    pub y: i32,
}

#[cfg(target_os = "windows")]
pub mod platform {
    use super::*;
    use windows::Win32::Foundation::{HWND, RECT, CloseHandle, LPARAM, BOOL};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
        GetWindowRect as WinGetWindowRect,
        SetWindowPos, SWP_NOSIZE, SWP_NOZORDER, SWP_NOACTIVATE,
        GetCursorPos, EnumWindows, IsWindowVisible,
    };
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        GetLastInputInfo, LASTINPUTINFO,
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VIRTUAL_KEY,
    };
    use windows::Win32::UI::WindowsAndMessaging::SetForegroundWindow;
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::System::SystemInformation::GetTickCount;
    use windows::core::PWSTR;

    pub fn get_foreground_window_info() -> Option<ActiveWindowInfo> {
        unsafe {
            let hwnd: HWND = GetForegroundWindow();
            if hwnd.0.is_null() {
                return None;
            }

            // Get window title
            let mut title_buf = [0u16; 512];
            let title_len = GetWindowTextW(hwnd, &mut title_buf);
            let title = String::from_utf16_lossy(&title_buf[..title_len as usize]);

            // Get process name
            let mut pid: u32 = 0;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            let process_name = get_process_name(pid).unwrap_or_default();

            // Get window rect
            let mut rect = RECT::default();
            let _ = WinGetWindowRect(hwnd, &mut rect);

            Some(ActiveWindowInfo {
                title,
                process_name,
                rect: WindowRect {
                    left: rect.left,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                },
            })
        }
    }

    /// Move the current foreground window to (x, y) position
    pub fn move_foreground_window(x: i32, y: i32) -> bool {
        unsafe {
            let hwnd: HWND = GetForegroundWindow();
            if hwnd.0.is_null() {
                return false;
            }
            SetWindowPos(
                hwnd,
                None,
                x,
                y,
                0,
                0,
                SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
            ).is_ok()
        }
    }

    /// Capture the current foreground window handle for later use
    pub fn capture_foreground_hwnd() -> bool {
        unsafe {
            let hwnd: HWND = GetForegroundWindow();
            if hwnd.0.is_null() {
                return false;
            }
            CAPTURED_HWND.store(hwnd.0 as isize, Ordering::SeqCst);
            true
        }
    }

    /// Move the previously captured window to (x, y)
    pub fn move_captured_window(x: i32, y: i32) -> bool {
        let raw = CAPTURED_HWND.load(Ordering::SeqCst);
        if raw == 0 {
            return false;
        }
        unsafe {
            let hwnd = HWND(raw as *mut _);
            SetWindowPos(
                hwnd,
                None,
                x,
                y,
                0,
                0,
                SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
            ).is_ok()
        }
    }

    unsafe fn get_process_name(pid: u32) -> Option<String> {
        let handle = OpenProcess(
            PROCESS_QUERY_LIMITED_INFORMATION,
            false,
            pid,
        ).ok()?;

        let mut buf = [0u16; 1024];
        let mut size = buf.len() as u32;
        let result = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_FORMAT(0),
            PWSTR(buf.as_mut_ptr()),
            &mut size,
        );

        let _ = CloseHandle(handle);

        if result.is_ok() {
            let path = String::from_utf16_lossy(&buf[..size as usize]);
            // Extract just the filename
            path.rsplit('\\').next().map(|s| s.to_lowercase())
        } else {
            None
        }
    }

    /// Send a space key press to the previously captured window (to pause video)
    pub fn send_space_to_captured_window() -> bool {
        let raw = CAPTURED_HWND.load(Ordering::SeqCst);
        if raw == 0 {
            return false;
        }
        unsafe {
            let hwnd = HWND(raw as *mut _);
            // Bring the captured window to foreground so it receives input
            let _ = SetForegroundWindow(hwnd);

            // Small delay to let the window activate
            std::thread::sleep(std::time::Duration::from_millis(50));

            // Send space key down + key up via SendInput
            let vk_space = VIRTUAL_KEY(0x20); // VK_SPACE
            let key_down = INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: vk_space,
                        wScan: 0,
                        dwFlags: Default::default(),
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };
            let key_up = INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: vk_space,
                        wScan: 0,
                        dwFlags: KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };
            let inputs = [key_down, key_up];
            let sent = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
            sent == 2
        }
    }

    pub fn get_idle_seconds() -> u32 {
        unsafe {
            let mut lii = LASTINPUTINFO {
                cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
                dwTime: 0,
            };
            if GetLastInputInfo(&mut lii).as_bool() {
                let tick = GetTickCount();
                (tick - lii.dwTime) / 1000
            } else {
                0
            }
        }
    }

    pub fn get_cursor_position() -> Option<CursorPosition> {
        unsafe {
            let mut point = POINT::default();
            if GetCursorPos(&mut point).is_ok() {
                Some(CursorPosition { x: point.x, y: point.y })
            } else {
                None
            }
        }
    }

    /// Move an arbitrary window (by HWND) to (x, y) without resizing or changing Z order.
    /// Used by the notepad-slide reminder animation.
    pub fn set_hwnd_position(hwnd_raw: i64, x: i32, y: i32) -> bool {
        if hwnd_raw == 0 {
            return false;
        }
        unsafe {
            let hwnd = HWND(hwnd_raw as *mut _);
            SetWindowPos(
                hwnd,
                None,
                x,
                y,
                0,
                0,
                SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
            ).is_ok()
        }
    }

    /// Read the outer rect of an arbitrary window by HWND.
    pub fn get_hwnd_rect(hwnd_raw: i64) -> Option<WindowRect> {
        if hwnd_raw == 0 {
            return None;
        }
        unsafe {
            let hwnd = HWND(hwnd_raw as *mut _);
            let mut rect = RECT::default();
            if WinGetWindowRect(hwnd, &mut rect).is_ok() {
                Some(WindowRect {
                    left: rect.left,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                })
            } else {
                None
            }
        }
    }

    use std::process::Command;
    use std::path::PathBuf;

    /// Create a txt file on the Desktop with the given text, open it with notepad,
    /// and poll for the resulting HWND. Returns HWND as i64 on success.
    pub fn create_reminder_notepad(text: &str) -> Result<i64, String> {
        // 1. Compute desktop path
        let desktop = get_desktop_dir().ok_or_else(|| "cannot resolve desktop".to_string())?;
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let filename = format!("reminder-{}.txt", ts);
        let full_path = desktop.join(&filename);

        // 2. Write UTF-8 BOM + text so notepad shows Chinese correctly
        let mut bytes: Vec<u8> = vec![0xEF, 0xBB, 0xBF];
        bytes.extend_from_slice(text.as_bytes());
        std::fs::write(&full_path, &bytes).map_err(|e| format!("write txt: {}", e))?;

        // 3. Spawn notepad
        let child = Command::new("notepad.exe")
            .arg(&full_path)
            .spawn()
            .map_err(|e| format!("spawn notepad: {}", e))?;
        let target_pid = child.id();

        // 4. Poll for HWND whose process PID matches
        for _ in 0..20 {
            std::thread::sleep(std::time::Duration::from_millis(100));
            if let Some(hwnd) = find_hwnd_by_pid(target_pid) {
                return Ok(hwnd);
            }
        }
        Err(format!("hwnd not found for pid {}", target_pid))
    }

    fn get_desktop_dir() -> Option<PathBuf> {
        if let Ok(profile) = std::env::var("USERPROFILE") {
            let desktop = PathBuf::from(&profile).join("Desktop");
            if desktop.exists() { return Some(desktop); }
            // OneDrive redirect fallback
            let one = PathBuf::from(&profile).join("OneDrive").join("Desktop");
            if one.exists() { return Some(one); }
            return Some(desktop);
        }
        None
    }

    struct EnumState {
        target_pid: u32,
        found: isize,
    }

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let state_ptr = lparam.0 as *mut EnumState;
        let state = &mut *state_ptr;
        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1);
        }
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == state.target_pid {
            state.found = hwnd.0 as isize;
            return BOOL(0); // stop
        }
        BOOL(1) // continue
    }

    fn find_hwnd_by_pid(pid: u32) -> Option<i64> {
        let mut state = EnumState { target_pid: pid, found: 0 };
        unsafe {
            let _ = EnumWindows(Some(enum_proc), LPARAM(&mut state as *mut _ as isize));
        }
        if state.found != 0 { Some(state.found as i64) } else { None }
    }
}

#[cfg(not(target_os = "windows"))]
pub mod platform {
    use super::*;

    pub fn get_foreground_window_info() -> Option<ActiveWindowInfo> {
        None
    }

    pub fn get_idle_seconds() -> u32 {
        0
    }

    pub fn move_foreground_window(_x: i32, _y: i32) -> bool {
        false
    }

    pub fn capture_foreground_hwnd() -> bool {
        false
    }

    pub fn move_captured_window(_x: i32, _y: i32) -> bool {
        false
    }

    pub fn send_space_to_captured_window() -> bool {
        false
    }

    pub fn get_cursor_position() -> Option<CursorPosition> {
        None
    }

    pub fn set_hwnd_position(_hwnd_raw: i64, _x: i32, _y: i32) -> bool {
        false
    }

    pub fn get_hwnd_rect(_hwnd_raw: i64) -> Option<WindowRect> {
        None
    }

    pub fn create_reminder_notepad(_text: &str) -> Result<i64, String> {
        Err("unsupported platform".to_string())
    }
}
