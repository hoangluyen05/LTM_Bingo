
const explicit = (
  import.meta.env.VITE_API_BASE_URL || ""
).trim();

// Sử dụng Vite proxy khi không cấu hình URL riêng
const BASE_URL = (explicit || "/api").replace(/\/+$/, "");

// Các API không yêu cầu đăng nhập
const PUBLIC_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
];

// Hàm gọi API dùng chung
export async function apiRequest(
  path,
  { method = "GET", body } = {}
) {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const url = `${BASE_URL}${normalizedPath}`;

  // Không gửi token cho API đăng nhập, đăng ký
  const isPublicEndpoint =
    PUBLIC_ENDPOINTS.includes(normalizedPath);

  const token = !isPublicEndpoint
    ? sessionStorage.getItem("bingo_access_token")
    : null;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const headers = {
      Accept: "application/json",
    };

    // Chỉ thêm Content-Type khi có body
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    // Chỉ gửi token cho API cần xác thực
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    console.log("[API REQUEST]", {
      method,
      url,
      hasBody: body !== undefined,
      hasToken: Boolean(token),
    });

    const response = await fetch(url, {
      method,
      headers,
      ...(body !== undefined
        ? { body: JSON.stringify(body) }
        : {}),
      signal: controller.signal,
    });

    // Đọc phản hồi dưới dạng text trước
    const responseText = await response.text();

    const contentType =
      response.headers.get("content-type") || "";

    console.log("[API RESPONSE]", {
      url,
      status: response.status,
      contentType,
      bodyPreview: response.ok
        ? "[Success response]"
        : responseText.slice(0, 300),
    });

    let data = null;

    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch {
        const error = new Error(
          `Server trả về HTTP ${response.status}, ` +
          `nhưng nội dung không phải JSON. ` +
          `Kiểm tra Network → Response.`
        );

        error.status = response.status;
        error.code = "INVALID_JSON";

        throw error;
      }
    }

    // Xử lý HTTP lỗi
    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        `Yêu cầu thất bại (HTTP ${response.status}).`;

      const error = new Error(message);

      error.status = response.status;
      error.code = data?.code || "HTTP_ERROR";
      error.fieldErrors = data?.fieldErrors || {};

      throw error;
    }

    // Thành công
    return data;

  } catch (error) {
    console.error("[API ERROR]", {
      message: error.message,
      status: error.status,
      code: error.code,
      url,
    });

    if (error.name === "AbortError") {
      throw new Error(
        "Server phản hồi quá lâu. Vui lòng thử lại."
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Không thể kết nối đến Backend. " +
        "Kiểm tra Spring Boot, Vite proxy và mạng."
      );
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}
