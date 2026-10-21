-- Sample seed data for development and testing

-- Clear existing data
TRUNCATE TABLE loans, otp_codes, users CASCADE;

-- Insert sample test users
INSERT INTO users (id, phone_number) VALUES
('11111111-1111-1111-1111-111111111111', '+919876543210'),
('22222222-2222-2222-2222-222222222222', '+919123456789');

-- Insert sample loans for user 1
INSERT INTO loans (id, user_id, friend_name, amount, due_date, is_repaid, repaid_at, notes) VALUES
-- Pending active loan (due in future)
('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Rahul Sharma', 1500.00, CURRENT_DATE + INTERVAL '10 days', FALSE, NULL, 'Concert ticket'),
-- Overdue loan (due date in the past, unpaid)
('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Priya Patel', 3000.00, CURRENT_DATE - INTERVAL '5 days', FALSE, NULL, 'Weekend trip fuel'),
-- Repaid loan
('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Amit Verma', 2000.00, CURRENT_DATE - INTERVAL '20 days', TRUE, CURRENT_TIMESTAMP - INTERVAL '2 days', 'Dinner bill');

-- Insert sample loan for user 2 (for tenant isolation testing)
INSERT INTO loans (id, user_id, friend_name, amount, due_date, is_repaid, repaid_at, notes) VALUES
('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Kiran Rao', 5000.00, CURRENT_DATE + INTERVAL '15 days', FALSE, NULL, 'Laptop accessories');
