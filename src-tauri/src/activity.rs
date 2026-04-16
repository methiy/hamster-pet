use serde::Serialize;

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

#[cfg(target_os = "windows")]
pub mod platform {
    use super::*;
    use windows::Win32::Foundation::{HWND, RECT, CloseHandle};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
        GetWindowRect as WinGetWindowRect,
        SetWindowPos, SWP_NOSIZE, SWP_NOZORDER, SWP_NOACTIVATE,
    };
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        GetLastInputInfo, LASTINPUTINFO,
    };
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
}
