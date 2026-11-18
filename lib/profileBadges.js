export async function loadProfileSectionBadgeCounts(supabase, userId, profileOverride = null) {
  const empty = { novidades: 0, eventos: 0, parasi: 0 };
  if (!userId) return empty;

  const now = new Date().toISOString();
  let profile = profileOverride;
  if (!profile) {
    const { data, error } = await supabase
      .from('profiles')
      .select('province_id,country_id')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    profile = data;
  }
  if (!profile?.province_id) return empty;

  const [{ data: viewRows, error: viewsError }, { data: eventRows, error: eventsError }] = await Promise.all([
    supabase.from('profile_section_views').select('section,last_seen_at').eq('user_id', userId),
    supabase.from('events')
      .select('id,created_at')
      .eq('province_id', profile.province_id)
      .eq('status', 'published')
      .eq('payment_status', 'paid')
      .eq('admin_approved', true)
      .gt('expires_at', now)
  ]);
  if (viewsError) throw viewsError;
  if (eventsError) throw eventsError;

  const seenAt = Object.fromEntries((viewRows || []).map(row => [row.section, row.last_seen_at]));
  const countAfter = (rows, section) => {
    const cutoff = seenAt[section] ? new Date(seenAt[section]).getTime() : 0;
    return (rows || []).filter(row => {
      const created = new Date(row.created_at || 0).getTime();
      return Number.isFinite(created) && created > cutoff;
    }).length;
  };

  const { data: savedRows, error: savedError } = await supabase
    .from('saved_businesses')
    .select('business_id,businesses(id,is_active,approval_status)')
    .eq('user_id', userId);
  if (savedError) throw savedError;

  const savedBusinessIds = [...new Set((savedRows || [])
    .filter(row => row.businesses?.id && row.businesses.is_active && row.businesses.approval_status === 'approved')
    .map(row => row.business_id))];

  let noveltyRows = [];
  if (savedBusinessIds.length) {
    const { data: subscriptionRows, error: subscriptionsError } = await supabase
      .from('business_subscriptions')
      .select('business_id,status,starts_at,expires_at,created_at')
      .in('business_id', savedBusinessIds)
      .order('starts_at', { ascending: false })
      .order('created_at', { ascending: false });

    let eligibleBusinessIds = savedBusinessIds;
    if (!subscriptionsError) {
      const latestByBusiness = new Map();
      (subscriptionRows || []).forEach(row => {
        if (!latestByBusiness.has(row.business_id)) latestByBusiness.set(row.business_id, row);
      });
      eligibleBusinessIds = savedBusinessIds.filter(id => {
        const sub = latestByBusiness.get(id);
        const expiry = sub?.expires_at ? new Date(sub.expires_at).getTime() : 0;
        return Boolean(sub && String(sub.status || '').trim().toLowerCase() === 'active' && Number.isFinite(expiry) && expiry > Date.now());
      });
    }

    if (eligibleBusinessIds.length) {
      const { data, error } = await supabase
        .from('business_updates')
        .select('id,created_at')
        .in('business_id', eligibleBusinessIds)
        .gt('expires_at', now);
      if (error) throw error;
      noveltyRows = data || [];
    }
  }

  const { data: premiumPlans, error: plansError } = await supabase
    .from('plans')
    .select('id')
    .eq('plan_type', 'Destaque Premium')
    .eq('duration_days', 30)
    .eq('is_active', true);
  if (plansError) throw plansError;

  let promotionRows = [];
  const planIds = (premiumPlans || []).map(row => row.id);
  if (planIds.length) {
    const { data: promotions, error: promotionsError } = await supabase
      .from('premium_promotions')
      .select('id,business_id,created_at')
      .in('plan_id', planIds)
      .eq('status', 'active')
      .gt('expires_at', now);
    if (promotionsError) throw promotionsError;

    const businessIds = [...new Set((promotions || []).map(row => row.business_id).filter(Boolean))];
    if (businessIds.length) {
      const { data: businesses, error: businessesError } = await supabase
        .from('businesses')
        .select('id,province_id,country_id')
        .in('id', businessIds);
      if (businessesError) throw businessesError;
      const eligibleIds = new Set((businesses || [])
        .filter(row => String(row.province_id || '') === String(profile.province_id || '') &&
          (!profile.country_id || String(row.country_id || '') === String(profile.country_id)))
        .map(row => row.id));
      promotionRows = (promotions || []).filter(row => eligibleIds.has(row.business_id));
    }
  }

  return {
    novidades: countAfter(noveltyRows, 'novidades'),
    eventos: countAfter(eventRows, 'eventos'),
    parasi: countAfter(promotionRows, 'parasi')
  };
}
