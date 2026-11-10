
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { register } from "../../services/authService";
import { validateRegister } from "../../utils/authValidation";
import "./Register.css";

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        password: "",
        confirmPassword: "",
    });

    const [touched, setTouched] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [serverErrors, setServerErrors] = useState({});
    const [serverMessage, setServerMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const errors = validateRegister(form);

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
            await register(form);

            navigate("/login", {
                state: {
                    message: "Đăng ký thành công! Hãy đăng nhập.",
                },
            });
        } catch (error) {
            setServerMessage(error.message);
            setServerErrors(error.fieldErrors || {});
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="register-container">
            <div className="register-box">
                <h1 className="register-title">BINGO ARENA</h1>

                <p className="register-subtitle">
                    Tạo tài khoản để tham gia đấu trường Bingo
                </p>

                {serverMessage && (
                    <div className="register-error" role="alert">
                        {serverMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="register-field">
                        <label htmlFor="register-username">
                            Tên đăng nhập
                        </label>

                        <input
                            id="register-username"
                            name="username"
                            type="text"
                            placeholder="Nhập tên đăng nhập"
                            autoComplete="username"
                            value={form.username}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            disabled={loading}
                            aria-invalid={Boolean(getError("username"))}
                            className={
                                getError("username") ? "input-error" : ""
                            }
                        />

                        {getError("username") && (
                            <p className="register-field-error">
                                {getError("username")}
                            </p>
                        )}
                    </div>

                    <div className="register-field">
                        <label htmlFor="register-password">
                            Mật khẩu
                        </label>

                        <input
                            id="register-password"
                            name="password"
                            type="password"
                            placeholder="Nhập mật khẩu"
                            autoComplete="new-password"
                            value={form.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            disabled={loading}
                            aria-invalid={Boolean(getError("password"))}
                            className={
                                getError("password") ? "input-error" : ""
                            }
                        />

                        {getError("password") && (
                            <p className="register-field-error">
                                {getError("password")}
                            </p>
                        )}
                    </div>

                    <div className="register-field">
                        <label htmlFor="register-confirm">
                            Xác nhận mật khẩu
                        </label>

                        <input
                            id="register-confirm"
                            name="confirmPassword"
                            type="password"
                            placeholder="Nhập lại mật khẩu"
                            autoComplete="new-password"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            disabled={loading}
                            aria-invalid={Boolean(getError("confirmPassword"))}
                            className={
                                getError("confirmPassword") ? "input-error" : ""
                            }
                        />

                        {getError("confirmPassword") && (
                            <p className="register-field-error">
                                {getError("confirmPassword")}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="register-button"
                        disabled={loading}
                    >
                        {loading ? "ĐANG ĐĂNG KÝ..." : "ĐĂNG KÝ"}
                    </button>
                </form>

                <Link className="register-back" to="/login">
                    Quay lại màn hình Đăng nhập
                </Link>
            </div>
        </div>
    );
}
