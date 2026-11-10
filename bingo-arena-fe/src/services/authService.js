
import { apiRequest } from "./api";

// API đăng nhập
export function login(data) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: {
      username: data.username.trim(),
      password: data.password,
    },
  });
}

// API đăng ký
export function register(data) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: {
      username: data.username.trim(),
      password: data.password,
    },
  });
}
