package com.talent.label.ai;

/**
 * 在一次对话请求的线程中传递 sessionId，
 * 让工具类无需依赖 LLM 传参即可获取当前会话 ID。
 */
public class SessionContext {

    private static final ThreadLocal<String> CURRENT_SESSION = new ThreadLocal<>();

    public static void set(String sessionId) {
        CURRENT_SESSION.set(sessionId);
    }

    public static String get() {
        return CURRENT_SESSION.get();
    }

    public static void clear() {
        CURRENT_SESSION.remove();
    }
}
