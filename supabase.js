// js/supabase.js
// تهيئة اتصال Supabase

// ⚠️ مهم: استبدل هذه القيم بمفاتيح مشروعك من Supabase Dashboard
const SUPABASE_URL = 'https://zeanhkfjqhatzeelhrcq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplYW5oa2ZqcWhhdHplZWxocmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjEzMzksImV4cCI6MjA4ODEzNzMzOX0.nnoHVv5HZjasIyuasrRA1qQGcuoDGcCgeVD3IVVlhSk'

// إنشاء عميل Supabase
const { createClient } = supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// التحقق من حالة المصادقة الحالية
async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser()
    return user
}

// تسجيل الخروج
async function logout() {
    const { error } = await supabaseClient.auth.signOut()
    if (!error) {
        window.location.href = 'index.html'
    }
}