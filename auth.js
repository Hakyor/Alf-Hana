// js/auth.js
// دوال التسجيل وتسجيل الدخول

// دالة التسجيل
async function register(name, email, whatsapp, password, role) {
    try {
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { name, role, whatsapp } }
        })

        if (authError) throw authError

        if (authData.user) {
            const { error: dbError } = await supabaseClient
                .from('users')
                .insert([{ id: authData.user.id, name, email, role, whatsapp }])

            if (dbError && dbError.code !== '23505') throw dbError
        }

        alert('✅ تم التسجيل بنجاح! يرجى تسجيل الدخول')
        window.location.href = 'login.html'

    } catch (error) {
        console.error('Registration error:', error)
        alert('❌ خطأ في التسجيل: ' + error.message)
    }
}

// دالة تسجيل الدخول
async function login(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password })
        if (error) throw error

        if (data.user) {
            let { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('role, name, whatsapp')
                .eq('id', data.user.id)
                .maybeSingle()

            if (userError) throw userError

            // fallback: search by email
            if (!userData) {
                const { data: byEmail } = await supabaseClient
                    .from('users')
                    .select('role, name, whatsapp')
                    .eq('email', email)
                    .maybeSingle()
                userData = byEmail
            }

            // fallback: auto-create from auth metadata
            if (!userData) {
                const meta     = data.user.user_metadata || {}
                const name     = meta.name     || email.split('@')[0]
                const role     = meta.role     || 'volunteer'
                const whatsapp = meta.whatsapp || ''

                const { error: upsertError } = await supabaseClient
                    .from('users')
                    .upsert([{ id: data.user.id, name, email, role, whatsapp }], { onConflict: 'email' })

                if (upsertError) throw upsertError

                const { data: freshData } = await supabaseClient
                    .from('users')
                    .select('role, name, whatsapp')
                    .eq('id', data.user.id)
                    .maybeSingle()

                userData = freshData || { name, role, whatsapp: '' }
            }

            sessionStorage.setItem('userId',       data.user.id)
            sessionStorage.setItem('userRole',     userData.role)
            sessionStorage.setItem('userName',     userData.name)
            sessionStorage.setItem('userWhatsapp', userData.whatsapp || '')

            window.location.href = `dashboard.html?type=${userData.role}`
        }

    } catch (error) {
        console.error('Login error:', error)
        alert('❌ خطأ في تسجيل الدخول: ' + error.message)
    }
}

// التحقق من الجلسة الحالية
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession()
    return session
}
