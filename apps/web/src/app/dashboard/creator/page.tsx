import { getMyCreatorProfile } from '@/lib/creators/actions'
import { CREDENTIAL_TYPES } from '@hyperspeed/shared/constants'
import { ProfileForm } from './profile-form'
import { CredentialForm } from './credential-form'
import { DeleteCredentialButton } from './delete-credential-button'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  verified: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-slate-100 text-slate-700',
}

export default async function CreatorPage() {
  const { profile, credentials, isVerified } = await getMyCreatorProfile()

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Creator profile
          </h1>
          <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
            Pack authors must have at least one verified credential to publish.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isVerified
              ? 'bg-[var(--color-primary-pale)] text-[var(--color-primary-deep)]'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {isVerified ? 'Verified' : 'Unverified'}
        </span>
      </div>

      <section className="rounded-xl border border-[var(--color-border-base)] bg-white p-8 shadow-sm">
        <h2 className="text-sm font-medium text-[var(--color-ink)]">Public profile</h2>
        <p className="mt-1 text-xs text-[var(--color-slate-soft)]">
          Shown on every pack you author.
        </p>
        <div className="mt-6">
          <ProfileForm profile={profile} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-[var(--color-ink)]">Credentials</h2>
            <p className="mt-1 text-xs text-[var(--color-slate-soft)]">
              Submit professional licenses, certifications, employment, degrees, or publications.
              Hyperspeed staff verify each.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
          {credentials.length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-slate-soft)]">No credentials yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Title
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Issuer
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                    Status
                  </th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((c) => (
                  <tr key={c.id} className="border-t border-[var(--color-border-base)]">
                    <td className="px-4 py-2 text-[var(--color-ink)]">
                      {c.title}
                      {c.licenseNumber ? (
                        <div className="font-mono text-xs text-[var(--color-slate-soft)]">
                          {c.licenseNumber}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-slate-soft)]">
                      {c.credentialType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-ink)]">{c.issuingOrganization}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          STATUS_STYLES[c.verificationStatus] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {c.verificationStatus}
                      </span>
                      {c.verificationNotes ? (
                        <div className="mt-1 text-xs text-[var(--color-slate-soft)]">
                          {c.verificationNotes}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {c.verificationStatus === 'pending' ? (
                        <DeleteCredentialButton credentialId={c.id} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <details className="rounded-xl border border-[var(--color-border-base)] bg-white p-6 shadow-sm">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-ink)]">
            + Add a credential
          </summary>
          <div className="mt-4">
            <CredentialForm types={[...CREDENTIAL_TYPES]} />
          </div>
        </details>
      </section>
    </div>
  )
}
