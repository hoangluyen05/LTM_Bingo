export function validateLogin(data) {
    const errors = {};
    const username = data.username.trim();

    if (!username) {
        errors.username = "Vui lòng nhập tên đăng nhập";
    } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        errors.username =
            "Tên đăng nhập phải có 3–30 ký tự, chỉ gồm chữ, số và _";
    }

    if (!data.password) {
        errors.password = "Vui lòng nhập mật khẩu";
    } else if (data.password.length < 6) {
        errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    return errors;
}

export function validateRegister(data) {
    const errors = validateLogin(data);

    if (!data.confirmPassword) {
        errors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (data.password !== data.confirmPassword) {
        errors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    return errors;
}