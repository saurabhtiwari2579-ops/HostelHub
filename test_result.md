#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Hostel room booking & management system for Shri Baijnath Hostel (real client handover). Google login via Supabase, room catalog (30 rooms), booking requests, manager approval + rent allotment, UPI rent payments with receipt image upload, manager payment approval, confidential per-room rent, occupancy summary, Excel export, WhatsApp rent reminders, emergency contacts."

backend:
  - task: "Supabase auth (Bearer token) + ensureProfile + manager allowlist"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js, /app/lib/supabaseServer.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Auth via Authorization Bearer <supabase access_token>; getUser validates token. Manager role decided by ADMIN_EMAILS allowlist. ws polyfill added for Node 20."
        -working: true
        -agent: "testing"
        -comment: "✅ Auth working correctly. Tested: 401 without token, 200 with token. Manager role correctly assigned to qa.manager@baijnath.test. Resident roles correctly assigned. ensureProfile creates/updates profiles properly."
  - task: "GET /api/me, /api/rooms (rent hidden from residents), /api/bookings, /api/payments"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "rooms returns monthly_rent only for managers. payments/bookings scoped to own resident unless manager."
        -working: true
        -agent: "testing"
        -comment: "✅ All GET endpoints working. /api/me returns correct profile, role, isManager, room, due. /api/rooms correctly hides monthly_rent from residents, shows to manager. Returns 30 rooms, room 5 is_store=true. /api/bookings and /api/payments correctly scoped to resident's own data, manager sees all."
  - task: "POST /api/bookings, /api/profile, /api/payments (multipart receipt upload to storage)"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "payments requires allotted room + rent set; uploads receipt to payment-receipts bucket; validates type/size."
        -working: true
        -agent: "testing"
        -comment: "✅ All POST endpoints working. /api/bookings creates booking with all details. /api/payments correctly validates: requires room allotted, rejects wrong file types (.txt returns 400), accepts images (PNG/JPG), uploads to storage successfully. File validation working (type and size checks)."
  - task: "Manager actions: bookings approve/reject (allot room+set rent), payments approve/reject, rooms rent, residents list/remove, stats, export, pending-rent"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "All gated by isManager; approve booking assigns room_number + allotted_on to resident profile and sets room rent, with capacity check."
        -working: true
        -agent: "testing"
        -comment: "✅ All manager endpoints working. /api/manager/bookings/approve correctly assigns room and rent, updates profile. /api/manager/bookings/reject works. /api/manager/payments/approve and reject work. /api/manager/stats returns all fields (occupied, partial, empty, beds, totalBeds, totalRooms=29, pendingPayments, pendingBookings). /api/manager/residents returns list with room rent. /api/manager/export returns all arrays. /api/manager/pending-rent works. All properly gated by isManager (residents get 403)."
  - task: "GET /api/payments/receipt signed URL (owner/manager only)"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Returns short-lived signed URL; residents restricted to own path prefix."
        -working: true
        -agent: "testing"
        -comment: "✅ Receipt signed URL working correctly. Owner (resident who uploaded) can get signed URL. Manager can get signed URL for any receipt. Other residents correctly get 403 when trying to access receipts they don't own. Data isolation working properly."

frontend:
  - task: "Login, Resident app (rooms/profile/payments), Manager console, emergency, Excel export"
    implemented: true
    working: "NA"
    file: "/app/app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Frontend built; not tested yet (awaiting user permission)."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Backend ready for testing. AUTH: pass Authorization: Bearer <supabase_access_token>. To mint tokens use Supabase Auth REST with keys from /app/.env: (1) create user: POST {NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users with header apikey=SUPABASE_SERVICE_ROLE_KEY and Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY, body {email,password,email_confirm:true}; (2) sign in: POST {NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password with header apikey=NEXT_PUBLIC_SUPABASE_ANON_KEY, body {email,password} -> use access_token. Create MANAGER token with email qa.manager@baijnath.test (already in ADMIN_EMAILS) and a RESIDENT token with email qa.resident1@baijnath.test (and a second resident qa.resident2@baijnath.test to verify data isolation). Base URL for API: http://localhost:3000/api. Test flow: resident submits booking (POST /api/bookings) -> manager approves with room+rent (POST /api/manager/bookings/approve) -> resident GET /api/me shows room+due -> resident POST /api/payments (multipart: transaction_id, month, receipt file) -> manager GET /api/payments?status=pending -> approve. Verify: residents cannot access /api/manager/* (403), unauthenticated (401), GET /api/rooms hides monthly_rent for residents but includes for manager, resident A cannot read resident B payments, /api/manager/stats occupancy math, /api/payments/receipt returns signed url for owner/manager only. Rooms already seeded (30, room 5 = store)."
    -agent: "testing"
    -message: "✅ BACKEND TESTING COMPLETE - ALL TESTS PASSED (36/36). Comprehensive test suite executed covering: (1) Auth: 401 without token, 200 with valid token ✅ (2) GET /api/me: correct role/isManager for residents and manager ✅ (3) GET /api/rooms: rent hidden from residents, visible to manager, 30 rooms, room 5 is store ✅ (4) Booking flow: create→approve→verify room assignment and rent ✅ (5) Authorization: residents get 403 on manager endpoints ✅ (6) Payment flow: multipart upload→approve→verify status ✅ (7) Payment validation: wrong file type rejected, no room allotted rejected ✅ (8) Data isolation: resident B cannot see resident A's data ✅ (9) Receipt signed URLs: working for owner and manager ✅ (10) Manager stats: all fields present, math correct ✅ (11) Manager endpoints: residents, export, pending-rent all working ✅ (12) Reject paths: booking and payment rejection working ✅. No critical issues found. Backend is production-ready."
