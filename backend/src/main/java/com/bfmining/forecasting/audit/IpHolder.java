package com.bfmining.forecasting.audit;

/**
 * ThreadLocal holder for the client IP address, populated by {@link IpExtractorFilter}.
 */
public final class IpHolder {

    private static final ThreadLocal<String> IP = new ThreadLocal<>();

    private IpHolder() {}

    public static void set(String ip) {
        IP.set(ip);
    }

    public static String get() {
        return IP.get();
    }

    public static void clear() {
        IP.remove();
    }
}
