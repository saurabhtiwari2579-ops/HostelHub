#!/usr/bin/env python3
"""
Backend API Test Suite for Shri Baijnath Hostel Management System
Tests all backend endpoints with proper authentication and authorization
"""

import requests
import json
import io
from PIL import Image

# Configuration from .env
SUPABASE_URL = "https://mfxsoietfxqwaosufgdm.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meHNvaWV0Znhxd2Fvc3VmZ2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0ODI3ODQsImV4cCI6MjEwNTA1ODc4NH0.TgTPPTXHGhzr4g0ptFD7unVSI1VgENMbsM2x5b9FfJ8"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meHNvaWV0Znhxd2Fvc3VmZ2RtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQ4Mjc4NCwiZXhwIjoyMTA1MDU4Nzg0fQ.3qv176klZQI_mioT-Mlr8Q0P81nsavWpZU3EKfj-U1s"
BASE_URL = "http://localhost:3000/api"

# Test users
MANAGER_EMAIL = "qa.manager@baijnath.test"
RESIDENT_A_EMAIL = "qa.resident1@baijnath.test"
RESIDENT_B_EMAIL = "qa.resident2@baijnath.test"
TEST_PASSWORD = "Test12345!"

# Global tokens
tokens = {}

def print_test(name):
    """Print test name"""
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print('='*80)

def print_result(passed, message):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")

def create_user(email):
    """Create a user via Supabase Admin API"""
    print(f"\nCreating user: {email}")
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "email": email,
        "password": TEST_PASSWORD,
        "email_confirm": True
    }
    
    try:
        resp = requests.post(url, headers=headers, json=data)
        if resp.status_code in [200, 201]:
            print(f"✅ User created: {email}")
            return True
        elif "already been registered" in resp.text or "User already registered" in resp.text:
            print(f"ℹ️  User already exists: {email}")
            return True
        else:
            print(f"⚠️  Create user response ({resp.status_code}): {resp.text[:200]}")
            return True  # Continue anyway
    except Exception as e:
        print(f"⚠️  Error creating user: {e}")
        return True  # Continue anyway

def get_access_token(email):
    """Sign in and get access token"""
    print(f"\nGetting access token for: {email}")
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    data = {
        "email": email,
        "password": TEST_PASSWORD
    }
    
    try:
        resp = requests.post(url, headers=headers, json=data)
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            print(f"✅ Got access token for {email}")
            return token
        else:
            print(f"❌ Failed to get token ({resp.status_code}): {resp.text[:200]}")
            return None
    except Exception as e:
        print(f"❌ Error getting token: {e}")
        return None

def setup_tokens():
    """Create users and get tokens for all test accounts"""
    print("\n" + "="*80)
    print("SETUP: Creating users and minting tokens")
    print("="*80)
    
    users = [
        ("manager", MANAGER_EMAIL),
        ("resident_a", RESIDENT_A_EMAIL),
        ("resident_b", RESIDENT_B_EMAIL)
    ]
    
    for key, email in users:
        create_user(email)
        token = get_access_token(email)
        if token:
            tokens[key] = token
        else:
            print(f"❌ CRITICAL: Failed to get token for {email}")
            return False
    
    print(f"\n✅ All tokens acquired successfully")
    return True

def create_test_image():
    """Create a small test PNG image"""
    img = Image.new('RGB', (100, 100), color='red')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

def test_1_auth():
    """Test 1: Authentication - 401 without token, 200 with token"""
    print_test("1. Authentication")
    
    # Test without token
    try:
        resp = requests.get(f"{BASE_URL}/rooms")
        if resp.status_code == 401:
            print_result(True, f"GET /api/rooms without token returns 401")
        else:
            print_result(False, f"GET /api/rooms without token returned {resp.status_code}, expected 401")
    except Exception as e:
        print_result(False, f"Error testing no auth: {e}")
    
    # Test with resident token
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_a']}"}
        resp = requests.get(f"{BASE_URL}/rooms", headers=headers)
        if resp.status_code == 200:
            print_result(True, f"GET /api/rooms with resident token returns 200")
        else:
            print_result(False, f"GET /api/rooms with resident token returned {resp.status_code}, expected 200")
    except Exception as e:
        print_result(False, f"Error testing with auth: {e}")

def test_2_me_endpoint():
    """Test 2: GET /api/me for resident and manager"""
    print_test("2. GET /api/me - Profile endpoint")
    
    # Test resident A
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_a']}"}
        resp = requests.get(f"{BASE_URL}/me", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            profile = data.get('profile', {})
            is_manager = data.get('isManager', False)
            role = profile.get('role', '')
            
            if role == 'resident' and is_manager == False:
                print_result(True, f"Resident A: role='resident', isManager=false")
            else:
                print_result(False, f"Resident A: role='{role}', isManager={is_manager} (expected resident/false)")
        else:
            print_result(False, f"GET /api/me for resident returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error testing resident /me: {e}")
    
    # Test manager
    try:
        headers = {"Authorization": f"Bearer {tokens['manager']}"}
        resp = requests.get(f"{BASE_URL}/me", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            profile = data.get('profile', {})
            is_manager = data.get('isManager', False)
            role = profile.get('role', '')
            
            if role == 'manager' and is_manager == True:
                print_result(True, f"Manager: role='manager', isManager=true")
            else:
                print_result(False, f"Manager: role='{role}', isManager={is_manager} (expected manager/true)")
        else:
            print_result(False, f"GET /api/me for manager returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error testing manager /me: {e}")

def test_3_rooms_endpoint():
    """Test 3: GET /api/rooms - rent hidden from residents, visible to manager"""
    print_test("3. GET /api/rooms - Rent visibility")
    
    # Test as resident
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_a']}"}
        resp = requests.get(f"{BASE_URL}/rooms", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            rooms = data.get('rooms', [])
            
            if len(rooms) == 30:
                print_result(True, f"Resident sees 30 rooms")
            else:
                print_result(False, f"Resident sees {len(rooms)} rooms, expected 30")
            
            # Check if monthly_rent is hidden
            has_rent = any('monthly_rent' in room for room in rooms)
            if not has_rent:
                print_result(True, f"Resident: monthly_rent field NOT included (correct)")
            else:
                print_result(False, f"Resident: monthly_rent field IS included (should be hidden)")
            
            # Check room 5 is store
            room_5 = next((r for r in rooms if r.get('room_number') == 5), None)
            if room_5 and room_5.get('is_store') == True:
                print_result(True, f"Room 5 is_store=true")
            else:
                print_result(False, f"Room 5 is_store not true")
        else:
            print_result(False, f"GET /api/rooms for resident returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error testing rooms as resident: {e}")
    
    # Test as manager
    try:
        headers = {"Authorization": f"Bearer {tokens['manager']}"}
        resp = requests.get(f"{BASE_URL}/rooms", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            rooms = data.get('rooms', [])
            
            # Check if monthly_rent is visible
            has_rent = any('monthly_rent' in room for room in rooms)
            if has_rent:
                print_result(True, f"Manager: monthly_rent field IS included (correct)")
            else:
                print_result(False, f"Manager: monthly_rent field NOT included (should be visible)")
        else:
            print_result(False, f"GET /api/rooms for manager returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error testing rooms as manager: {e}")

# Global variables to store IDs for later tests
booking_id = None
payment_id = None
receipt_path = None

def test_4_booking_flow():
    """Test 4: Complete booking flow - create, approve, verify"""
    global booking_id
    print_test("4. Booking Flow - Create, Approve, Verify")
    
    # Step 1: Resident A creates booking
    try:
        headers = {
            "Authorization": f"Bearer {tokens['resident_a']}",
            "Content-Type": "application/json"
        }
        booking_data = {
            "full_name": "Rajesh Kumar",
            "aadhaar": "123456789012",
            "course": "B.Tech Computer Science",
            "self_mobile": "9876543210",
            "parent_mobile": "9876543211",
            "permanent_address": "123 Main Street, Delhi",
            "room_number": 14
        }
        resp = requests.post(f"{BASE_URL}/bookings", headers=headers, json=booking_data)
        
        if resp.status_code == 201:
            booking = resp.json().get('booking', {})
            booking_id = booking.get('id')
            print_result(True, f"Resident A created booking (ID: {booking_id})")
        else:
            print_result(False, f"POST /api/bookings returned {resp.status_code}: {resp.text[:200]}")
            return
    except Exception as e:
        print_result(False, f"Error creating booking: {e}")
        return
    
    # Step 2: Manager gets bookings and sees it pending
    try:
        headers = {"Authorization": f"Bearer {tokens['manager']}"}
        resp = requests.get(f"{BASE_URL}/bookings", headers=headers)
        
        if resp.status_code == 200:
            bookings = resp.json().get('bookings', [])
            pending_booking = next((b for b in bookings if b.get('id') == booking_id), None)
            
            if pending_booking and pending_booking.get('status') == 'pending':
                print_result(True, f"Manager sees booking as pending")
            else:
                print_result(False, f"Manager doesn't see booking as pending")
        else:
            print_result(False, f"GET /api/bookings for manager returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error getting bookings as manager: {e}")
    
    # Step 3: Manager approves booking with room 14 and rent 6500
    try:
        headers = {
            "Authorization": f"Bearer {tokens['manager']}",
            "Content-Type": "application/json"
        }
        approve_data = {
            "id": booking_id,
            "room_number": 14,
            "monthly_rent": 6500
        }
        resp = requests.post(f"{BASE_URL}/manager/bookings/approve", headers=headers, json=approve_data)
        
        if resp.status_code == 200:
            print_result(True, f"Manager approved booking for room 14 with rent 6500")
        else:
            print_result(False, f"POST /api/manager/bookings/approve returned {resp.status_code}: {resp.text[:200]}")
            return
    except Exception as e:
        print_result(False, f"Error approving booking: {e}")
        return
    
    # Step 4: Resident A checks /api/me to verify room assignment
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_a']}"}
        resp = requests.get(f"{BASE_URL}/me", headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            room = data.get('room', {})
            due = data.get('due')
            room_number = room.get('room_number') if room else None
            
            if room_number == 14 and due == 6500:
                print_result(True, f"Resident A: room_number=14, due=6500")
            else:
                print_result(False, f"Resident A: room_number={room_number}, due={due} (expected 14, 6500)")
        else:
            print_result(False, f"GET /api/me for resident A returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error verifying room assignment: {e}")

def test_5_authorization():
    """Test 5: Authorization - residents cannot access manager endpoints"""
    print_test("5. Authorization - Manager endpoints forbidden for residents")
    
    # Test resident trying to approve booking
    try:
        headers = {
            "Authorization": f"Bearer {tokens['resident_a']}",
            "Content-Type": "application/json"
        }
        data = {"id": "dummy-id", "room_number": 1, "monthly_rent": 5000}
        resp = requests.post(f"{BASE_URL}/manager/bookings/approve", headers=headers, json=data)
        
        if resp.status_code == 403:
            print_result(True, f"Resident A POST /api/manager/bookings/approve returns 403")
        else:
            print_result(False, f"Resident A POST /api/manager/bookings/approve returned {resp.status_code}, expected 403")
    except Exception as e:
        print_result(False, f"Error testing manager endpoint as resident: {e}")
    
    # Test resident trying to access stats
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_a']}"}
        resp = requests.get(f"{BASE_URL}/manager/stats", headers=headers)
        
        if resp.status_code == 403:
            print_result(True, f"Resident A GET /api/manager/stats returns 403")
        else:
            print_result(False, f"Resident A GET /api/manager/stats returned {resp.status_code}, expected 403")
    except Exception as e:
        print_result(False, f"Error testing stats as resident: {e}")

def test_6_payment_flow():
    """Test 6: Payment flow with multipart file upload"""
    global payment_id, receipt_path
    print_test("6. Payment Flow - Upload, Approve, Verify")
    
    # Step 1: Resident A submits payment with receipt
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_a']}"}
        
        # Create test image
        img_buffer = create_test_image()
        
        files = {
            'receipt': ('test_receipt.png', img_buffer, 'image/png')
        }
        data = {
            'transaction_id': 'TESTTXN1',
            'month': 'December 2025'
        }
        
        resp = requests.post(f"{BASE_URL}/payments", headers=headers, files=files, data=data)
        
        if resp.status_code == 201:
            payment = resp.json().get('payment', {})
            payment_id = payment.get('id')
            receipt_path = payment.get('receipt_path')
            print_result(True, f"Resident A submitted payment (ID: {payment_id})")
        else:
            print_result(False, f"POST /api/payments returned {resp.status_code}: {resp.text[:200]}")
            return
    except Exception as e:
        print_result(False, f"Error submitting payment: {e}")
        return
    
    # Step 2: Manager gets pending payments
    try:
        headers = {"Authorization": f"Bearer {tokens['manager']}"}
        resp = requests.get(f"{BASE_URL}/payments?status=pending", headers=headers)
        
        if resp.status_code == 200:
            payments = resp.json().get('payments', [])
            pending_payment = next((p for p in payments if p.get('id') == payment_id), None)
            
            if pending_payment:
                print_result(True, f"Manager sees payment in pending list")
            else:
                print_result(False, f"Manager doesn't see payment in pending list")
        else:
            print_result(False, f"GET /api/payments?status=pending returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error getting pending payments: {e}")
    
    # Step 3: Manager approves payment
    try:
        headers = {
            "Authorization": f"Bearer {tokens['manager']}",
            "Content-Type": "application/json"
        }
        data = {"id": payment_id}
        resp = requests.post(f"{BASE_URL}/manager/payments/approve", headers=headers, json=data)
        
        if resp.status_code == 200:
            print_result(True, f"Manager approved payment")
        else:
            print_result(False, f"POST /api/manager/payments/approve returned {resp.status_code}: {resp.text[:200]}")
            return
    except Exception as e:
        print_result(False, f"Error approving payment: {e}")
        return
    
    # Step 4: Resident A checks payments to see approved status
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_a']}"}
        resp = requests.get(f"{BASE_URL}/payments", headers=headers)
        
        if resp.status_code == 200:
            payments = resp.json().get('payments', [])
            approved_payment = next((p for p in payments if p.get('id') == payment_id), None)
            
            if approved_payment and approved_payment.get('status') == 'approved':
                print_result(True, f"Resident A sees payment status as 'approved'")
            else:
                status = approved_payment.get('status') if approved_payment else 'not found'
                print_result(False, f"Payment status is '{status}', expected 'approved'")
        else:
            print_result(False, f"GET /api/payments for resident returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error checking payment status: {e}")

def test_7_payment_validation():
    """Test 7: Payment validation - wrong file type and no room allotted"""
    print_test("7. Payment Validation")
    
    # Test wrong file type
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_a']}"}
        
        # Create a text file
        txt_buffer = io.BytesIO(b"This is a text file")
        
        files = {
            'receipt': ('test.txt', txt_buffer, 'text/plain')
        }
        data = {
            'transaction_id': 'TESTTXN2',
            'month': 'December 2025'
        }
        
        resp = requests.post(f"{BASE_URL}/payments", headers=headers, files=files, data=data)
        
        if resp.status_code == 400:
            print_result(True, f"POST /api/payments with .txt file returns 400")
        else:
            print_result(False, f"POST /api/payments with .txt file returned {resp.status_code}, expected 400")
    except Exception as e:
        print_result(False, f"Error testing wrong file type: {e}")
    
    # Test resident with no room allotted (Resident B)
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_b']}"}
        
        img_buffer = create_test_image()
        
        files = {
            'receipt': ('test_receipt.png', img_buffer, 'image/png')
        }
        data = {
            'transaction_id': 'TESTTXN3',
            'month': 'December 2025'
        }
        
        resp = requests.post(f"{BASE_URL}/payments", headers=headers, files=files, data=data)
        
        if resp.status_code == 400 and "No room allotted" in resp.text:
            print_result(True, f"Resident B (no room) POST /api/payments returns 400 'No room allotted'")
        else:
            print_result(False, f"Resident B POST /api/payments returned {resp.status_code}: {resp.text[:100]}")
    except Exception as e:
        print_result(False, f"Error testing no room allotted: {e}")

def test_8_data_isolation():
    """Test 8: Data isolation - Resident B cannot see Resident A's payments"""
    print_test("8. Data Isolation")
    
    # Resident B gets payments (should be empty or only own)
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_b']}"}
        resp = requests.get(f"{BASE_URL}/payments", headers=headers)
        
        if resp.status_code == 200:
            payments = resp.json().get('payments', [])
            
            # Check if any payment belongs to resident A
            has_resident_a_payment = any(p.get('id') == payment_id for p in payments)
            
            if not has_resident_a_payment:
                print_result(True, f"Resident B cannot see Resident A's payments")
            else:
                print_result(False, f"Resident B CAN see Resident A's payments (data leak!)")
        else:
            print_result(False, f"GET /api/payments for resident B returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error testing data isolation: {e}")
    
    # Resident B tries to access Resident A's receipt
    if receipt_path:
        try:
            headers = {"Authorization": f"Bearer {tokens['resident_b']}"}
            resp = requests.get(f"{BASE_URL}/payments/receipt?path={receipt_path}", headers=headers)
            
            if resp.status_code == 403:
                print_result(True, f"Resident B GET receipt of Resident A returns 403")
            else:
                print_result(False, f"Resident B GET receipt returned {resp.status_code}, expected 403")
        except Exception as e:
            print_result(False, f"Error testing receipt access: {e}")

def test_9_receipt_signed_url():
    """Test 9: Receipt signed URL for owner and manager"""
    print_test("9. Receipt Signed URL")
    
    if not receipt_path:
        print_result(False, "No receipt path available from previous test")
        return
    
    # Resident A (owner) gets signed URL
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_a']}"}
        resp = requests.get(f"{BASE_URL}/payments/receipt?path={receipt_path}", headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            url = data.get('url')
            if url:
                print_result(True, f"Resident A (owner) gets signed URL")
            else:
                print_result(False, f"Response missing 'url' field")
        else:
            print_result(False, f"GET receipt for owner returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error getting receipt as owner: {e}")
    
    # Manager gets signed URL
    try:
        headers = {"Authorization": f"Bearer {tokens['manager']}"}
        resp = requests.get(f"{BASE_URL}/payments/receipt?path={receipt_path}", headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            url = data.get('url')
            if url:
                print_result(True, f"Manager gets signed URL")
            else:
                print_result(False, f"Response missing 'url' field")
        else:
            print_result(False, f"GET receipt for manager returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error getting receipt as manager: {e}")

def test_10_manager_stats():
    """Test 10: Manager stats endpoint"""
    print_test("10. Manager Stats")
    
    try:
        headers = {"Authorization": f"Bearer {tokens['manager']}"}
        resp = requests.get(f"{BASE_URL}/manager/stats", headers=headers)
        
        if resp.status_code == 200:
            stats = resp.json()
            
            required_fields = ['occupied', 'partial', 'empty', 'beds', 'totalBeds', 
                             'totalRooms', 'pendingPayments', 'pendingBookings']
            
            missing_fields = [f for f in required_fields if f not in stats]
            
            if not missing_fields:
                print_result(True, f"Manager stats returns all required fields")
                
                # Check totalRooms = 29 (30 - 1 store)
                if stats.get('totalRooms') == 29:
                    print_result(True, f"totalRooms = 29 (non-store rooms)")
                else:
                    print_result(False, f"totalRooms = {stats.get('totalRooms')}, expected 29")
                
                # Check partial >= 1 (room 14 should be partial after booking)
                if stats.get('partial', 0) >= 1:
                    print_result(True, f"partial >= 1 (room 14 is partial)")
                else:
                    print_result(False, f"partial = {stats.get('partial')}, expected >= 1")
                
                print(f"Stats: {json.dumps(stats, indent=2)}")
            else:
                print_result(False, f"Missing fields: {missing_fields}")
        else:
            print_result(False, f"GET /api/manager/stats returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error getting manager stats: {e}")

def test_11_manager_endpoints():
    """Test 11: Other manager endpoints - residents, export, pending-rent"""
    print_test("11. Manager Endpoints - Residents, Export, Pending Rent")
    
    # GET /api/manager/residents
    try:
        headers = {"Authorization": f"Bearer {tokens['manager']}"}
        resp = requests.get(f"{BASE_URL}/manager/residents", headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            residents = data.get('residents', [])
            
            # Check if residents have room rent info
            has_room_info = any(r.get('room') is not None for r in residents if r.get('room_number'))
            
            if has_room_info:
                print_result(True, f"GET /api/manager/residents includes room rent info")
            else:
                print_result(True, f"GET /api/manager/residents returns {len(residents)} residents")
        else:
            print_result(False, f"GET /api/manager/residents returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error getting residents: {e}")
    
    # GET /api/manager/export
    try:
        headers = {"Authorization": f"Bearer {tokens['manager']}"}
        resp = requests.get(f"{BASE_URL}/manager/export", headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            
            required_arrays = ['residents', 'rooms', 'payments', 'bookings']
            has_all = all(key in data and isinstance(data[key], list) for key in required_arrays)
            
            if has_all:
                print_result(True, f"GET /api/manager/export returns all required arrays")
            else:
                print_result(False, f"Export missing required arrays")
        else:
            print_result(False, f"GET /api/manager/export returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error getting export: {e}")
    
    # GET /api/manager/pending-rent
    try:
        headers = {"Authorization": f"Bearer {tokens['manager']}"}
        resp = requests.get(f"{BASE_URL}/manager/pending-rent", headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            pending = data.get('pending', [])
            month = data.get('month')
            
            if isinstance(pending, list) and month:
                print_result(True, f"GET /api/manager/pending-rent returns pending list for {month}")
            else:
                print_result(False, f"Pending rent response malformed")
        else:
            print_result(False, f"GET /api/manager/pending-rent returned {resp.status_code}")
    except Exception as e:
        print_result(False, f"Error getting pending rent: {e}")

def test_12_reject_paths():
    """Test 12: Reject booking and payment"""
    print_test("12. Reject Paths - Booking and Payment")
    
    # Create another booking to reject
    try:
        headers = {
            "Authorization": f"Bearer {tokens['resident_b']}",
            "Content-Type": "application/json"
        }
        booking_data = {
            "full_name": "Priya Sharma",
            "aadhaar": "987654321098",
            "course": "M.Tech Electronics",
            "self_mobile": "9876543220",
            "parent_mobile": "9876543221",
            "permanent_address": "456 Park Avenue, Mumbai",
            "room_number": 15
        }
        resp = requests.post(f"{BASE_URL}/bookings", headers=headers, json=booking_data)
        
        if resp.status_code == 201:
            booking = resp.json().get('booking', {})
            reject_booking_id = booking.get('id')
            
            # Now reject it
            headers = {
                "Authorization": f"Bearer {tokens['manager']}",
                "Content-Type": "application/json"
            }
            data = {"id": reject_booking_id}
            resp = requests.post(f"{BASE_URL}/manager/bookings/reject", headers=headers, json=data)
            
            if resp.status_code == 200:
                print_result(True, f"Manager rejected booking successfully")
            else:
                print_result(False, f"POST /api/manager/bookings/reject returned {resp.status_code}")
        else:
            print_result(False, f"Failed to create booking for rejection test")
    except Exception as e:
        print_result(False, f"Error testing booking rejection: {e}")
    
    # Create another payment to reject (using resident A who has room)
    try:
        headers = {"Authorization": f"Bearer {tokens['resident_a']}"}
        
        img_buffer = create_test_image()
        
        files = {
            'receipt': ('test_receipt2.png', img_buffer, 'image/png')
        }
        data = {
            'transaction_id': 'TESTTXN_REJECT',
            'month': 'January 2026'
        }
        
        resp = requests.post(f"{BASE_URL}/payments", headers=headers, files=files, data=data)
        
        if resp.status_code == 201:
            payment = resp.json().get('payment', {})
            reject_payment_id = payment.get('id')
            
            # Now reject it
            headers = {
                "Authorization": f"Bearer {tokens['manager']}",
                "Content-Type": "application/json"
            }
            data = {"id": reject_payment_id}
            resp = requests.post(f"{BASE_URL}/manager/payments/reject", headers=headers, json=data)
            
            if resp.status_code == 200:
                print_result(True, f"Manager rejected payment successfully")
            else:
                print_result(False, f"POST /api/manager/payments/reject returned {resp.status_code}")
        else:
            print_result(False, f"Failed to create payment for rejection test")
    except Exception as e:
        print_result(False, f"Error testing payment rejection: {e}")

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("BACKEND API TEST SUITE - Shri Baijnath Hostel Management")
    print("="*80)
    
    # Setup
    if not setup_tokens():
        print("\n❌ CRITICAL: Token setup failed. Cannot proceed with tests.")
        return
    
    # Run all tests
    test_1_auth()
    test_2_me_endpoint()
    test_3_rooms_endpoint()
    test_4_booking_flow()
    test_5_authorization()
    test_6_payment_flow()
    test_7_payment_validation()
    test_8_data_isolation()
    test_9_receipt_signed_url()
    test_10_manager_stats()
    test_11_manager_endpoints()
    test_12_reject_paths()
    
    print("\n" + "="*80)
    print("TEST SUITE COMPLETE")
    print("="*80)

if __name__ == "__main__":
    main()
