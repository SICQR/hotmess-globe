export const bestEffortRateLimit = async ({
  serviceClient,
  bucketKey,
  userId,
  ip,
  windowSeconds,
  maxRequests,
}) => {
  if (!serviceClient) {
    return { allowed: true, remaining: null, skipped: true };
  }

  try {
    const { data, error } = await serviceClient.rpc('check_routing_rate_limit', {
      p_bucket_key: bucketKey,
      p_user_id: userId || null,
      p_ip: ip || null,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    });

    if (error) {
      return { allowed: true, remaining: null, skipped: true, error };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const allowed = row?.allowed !== false;
    const remaining = typeof row?.remaining === 'number' ? row.remaining : null;

    return { allowed, remaining, skipped: false };
  } catch (error) {
    return { allowed: true, remaining: null, skipped: true, error };
  }
};

export const minuteBucket = (nowMs = Date.now()) => Math.floor(nowMs / 60000);
