-- Delete old test redemption data that violates the global 1/day rule
DELETE FROM redemptions 
WHERE metadata->>'test_data' = 'true';

-- Clean up rate limit entries
DELETE FROM token_rate_limits;

-- Clean up test activity logs
DELETE FROM user_activity_logs 
WHERE metadata->>'test_data' = 'true';

-- Clean up points transactions for test user
DELETE FROM points_transactions 
WHERE user_id = '46b15f9d-ed46-41b0-aa6a-5aa2334c407e';

-- Reset user points for test user  
DELETE FROM user_points
WHERE user_id = '46b15f9d-ed46-41b0-aa6a-5aa2334c407e';