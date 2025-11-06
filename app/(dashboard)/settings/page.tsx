import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('timezone')
    .eq('user_id', user.id)
    .single()

  let timezone = 'Europe/Warsaw'
  if (profile && typeof profile === 'object' && 'timezone' in profile) {
    const profileTimezone = (profile as { timezone?: string }).timezone
    if (typeof profileTimezone === 'string') {
      timezone = profileTimezone
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timezone</CardTitle>
          <CardDescription>
            Set your timezone to ensure dates and times are displayed correctly. 
            Default is set to Europe/Warsaw (Poland).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm initialTimezone={timezone} />
        </CardContent>
      </Card>
    </div>
  )
}

