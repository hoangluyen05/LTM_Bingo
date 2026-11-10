
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { login } from "../../services/authService";
import { validateLogin } from "../../utils/authValidation";
import "./Login.css";

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({
        username: "",
        password: "",
    });

    const [touched, setTouched] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [serverErrors, setServerErrors] = useState({});
    const [serverMessage, setServerMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const errors = validateLogin(form);

    function handleChange(e) {
        const { name, value } = e.target;

        setForm((prev) => ({ ...prev, [name]: value }));
        setServerMessage("");
        setServerErrors((prev) => ({ ...prev, [name]: "" }));
    }

    function handleBlur(e) {
        setTouched((prev) => ({
            ...prev,
            [e.target.name]: true,
        }));
    }

    function getError(name) {
        if (!(submitted || touched[name])) return "";
        return serverErrors[name] || errors[name] || "";
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (loading) return;

        setSubmitted(true);
        setServerMessage("");

        if (Object.keys(errors).length > 0) return;

        setLoading(true);

        try {
            const data = await login({
                username: form.username.trim(),
                password: form.password,
            });

            sessionStorage.setItem(
                "bingo_access_token",
                data.accessToken
            );
            sessionStorage.setItem(
                "bingo_user",
                JSON.stringify(data.user)
            );

            navigate("/", { replace: true });
        } catch (error) {
            setServerMessage(error.message);
            setServerErrors(error.fieldErrors || {});
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-container">
            <div className="login-box">
                <h1 className="login-title">BINGO ARENA</h1>

                <p className="login-subtitle">
                    Sàn đấu Bingo trực tuyến đối kháng
                </p>

                {location.state?.message && (
                    <div className="login-success" role="status">
                        {location.state.message}
                    </div>
                )}

                {serverMessage && (
                    <div className="login-error" role="alert">
                        {serverMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="login-field">
                        <label htmlFor="login-username">
                            Tên đăng nhập
                        </label>

                        <input
                            id="login-username"
                            type="text"
                            name="username"
                            placeholder="Nhập tên đăng nhập"
                            autoComplete="username"
                            value={form.username}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            aria-invalid={Boolean(getError("username"))}
                            disabled={loading}
                            className={
                                getError("username") ? "input-error" : ""
                            }
                        />

                        {getError("username") && (
                            <p className="login-field-error">
                                {getError("username")}
                            </p>
                        )}
                    </div>

                    <div className="login-field">
                        <label htmlFor="login-password">
                            Mật khẩu
                        </label>

                        <input
                            id="login-password"
                            type="password"
                            name="password"
                            placeholder="Nhập mật khẩu"
                            autoComplete="current-password"
                            value={form.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            aria-invalid={Boolean(getError("password"))}
                            disabled={loading}
                            className={
                                getError("password") ? "input-error" : ""
                            }
                        />

                        {getError("password") && (
                            <p className="login-field-error">
                                {getError("password")}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
                    </button>
                </form>

                <p className="login-register">
                    Chưa có tài khoản?{" "}
                    <Link to="/register">Đăng ký ngay</Link>
                </p>
            </div>
        </div>
    );
}
