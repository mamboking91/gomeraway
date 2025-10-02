-- Subscription Limits Test Script
-- This script helps verify that subscription limits are working correctly

-- Check current subscription status for all users
SELECT 
  u.email,
  s.plan,
  s.status,
  s.created_at as subscription_date,
  COUNT(l.id) as active_listings,
  CASE 
    WHEN s.plan = 'básico' OR s.plan = 'basico' THEN 1
    WHEN s.plan = 'premium' THEN 5
    WHEN s.plan = 'diamante' THEN -1
    ELSE 0
  END as max_allowed,
  CASE 
    WHEN s.plan = 'diamante' THEN true
    WHEN COUNT(l.id) < CASE 
      WHEN s.plan = 'básico' OR s.plan = 'basico' THEN 1
      WHEN s.plan = 'premium' THEN 5
      ELSE 0
    END THEN true
    ELSE false
  END as can_create_more
FROM auth.users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN listings l ON u.id = l.host_id AND l.is_active = true
GROUP BY u.id, u.email, s.plan, s.status, s.created_at
ORDER BY s.created_at DESC;

-- Check for users who have exceeded their limits
SELECT 
  u.email,
  s.plan,
  COUNT(l.id) as active_listings,
  CASE 
    WHEN s.plan = 'básico' OR s.plan = 'basico' THEN 1
    WHEN s.plan = 'premium' THEN 5
    WHEN s.plan = 'diamante' THEN -1
    ELSE 0
  END as max_allowed
FROM auth.users u
JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN listings l ON u.id = l.host_id AND l.is_active = true
WHERE s.plan != 'diamante'
GROUP BY u.id, u.email, s.plan
HAVING COUNT(l.id) >= CASE 
  WHEN s.plan = 'básico' OR s.plan = 'basico' THEN 1
  WHEN s.plan = 'premium' THEN 5
  ELSE 0
END;

-- Test the check-listing-limits function behavior by simulating different scenarios
-- (These are the logic checks performed by the Edge Function)

-- Scenario 1: User with no subscription
SELECT 'No subscription - Should block creation' as test_case,
  CASE WHEN s.id IS NULL THEN 'BLOCKED ✓' ELSE 'ALLOWED ✗' END as result
FROM auth.users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
WHERE u.email = 'test@example.com'; -- Replace with actual test email

-- Scenario 2: Basic plan user at limit
SELECT 'Basic plan at limit - Should block creation' as test_case,
  CASE 
    WHEN s.plan IN ('básico', 'basico') AND COUNT(l.id) >= 1 THEN 'BLOCKED ✓'
    WHEN s.plan IN ('básico', 'basico') AND COUNT(l.id) < 1 THEN 'ALLOWED ✓'
    ELSE 'N/A'
  END as result
FROM auth.users u
JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN listings l ON u.id = l.host_id AND l.is_active = true
WHERE s.plan IN ('básico', 'basico')
GROUP BY u.id, s.plan;

-- Scenario 3: Premium plan user at limit
SELECT 'Premium plan at limit - Should block creation' as test_case,
  CASE 
    WHEN s.plan = 'premium' AND COUNT(l.id) >= 5 THEN 'BLOCKED ✓'
    WHEN s.plan = 'premium' AND COUNT(l.id) < 5 THEN 'ALLOWED ✓'
    ELSE 'N/A'
  END as result
FROM auth.users u
JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN listings l ON u.id = l.host_id AND l.is_active = true
WHERE s.plan = 'premium'
GROUP BY u.id, s.plan;

-- Scenario 4: Diamond plan user (unlimited)
SELECT 'Diamond plan - Should always allow creation' as test_case,
  CASE 
    WHEN s.plan = 'diamante' THEN 'ALLOWED ✓'
    ELSE 'N/A'
  END as result
FROM auth.users u
JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
WHERE s.plan = 'diamante';

-- Summary statistics
SELECT 
  'SUMMARY' as section,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN u.id END) as users_with_subscription,
  COUNT(DISTINCT l.host_id) as users_with_listings,
  SUM(CASE WHEN l.is_active THEN 1 ELSE 0 END) as total_active_listings
FROM auth.users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN listings l ON u.id = l.host_id;