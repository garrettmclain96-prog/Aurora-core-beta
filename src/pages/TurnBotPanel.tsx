import { PageTransition } from '../components/PageTransition'
import { useState } from 'react'
import { Radio, Bluetooth, Wifi, Battery, Cpu, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { PageHeader, StatusDot, SectionLabel } from '../components/Layout'
import { devices, type TurnBotDevice } from '../lib/seed'

const TYPE_META = {
  mini: { label: 'TurnBot Mini',  icon: '🔵', color: 'var(--color-blue)',   proto: 'BLE 5.3',       torqueUnit: 'Nm', maxLabel: '5 Nm'  },
  pro:  { label: 'TurnBot Pro',   icon: '⚡',  color: 'var(--color-cyan)',   proto: 'Matter 1.5',    torqueUnit: 'Nm', maxLabel: '25 Nm' },
  hub:  { label: 'TurnBot Hub',   icon: '🌐',  color: 'var(--color-purple)', proto: 'ESP32-C6 Mesh', torqueUnit: '—',  maxLabel: '32 nodes' },
}

function DeviceCard({ device: d }: { device: TurnBotDevice }) {
  const [online, setOnline] = useState(d.online)
  const meta = TYPE_META[d.type]

  return (
    <div
      className={clsx('card card-glow p-5 flex flex-col gap-4', !online && 'opacity-60')}
      style={{ borderColor: online ? meta.color + '30' : undefined }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border"
            style={{ borderColor: meta.color + '40', backgroundColor: meta.color + '12' }}
          >
            {meta.icon}
          </div>
          <div>
            <div className="text-sm font-display font-bold text-[var(--color-text)]">{meta.label}</div>
            <div className="text-[10px] font-display text-[var(--color-muted)]">{d.id} · {d.zone}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <StatusDot status={online ? 'active' : 'off'} />
            <span className="text-[10px] font-display text-[var(--color-muted)]">{online ? 'Online' : 'Offline'}</span>
          </div>
          <span className="text-[9px] text-[var(--color-dim)] font-display">{d.lastSeen}</span>
        </div>
      </div>

      {/* Protocol badge */}
      <div className="flex items-center gap-2">
        {d.type === 'mini' && <Bluetooth className="w-3 h-3" style={{ color: meta.color }} />}
        {d.type === 'pro'  && <Wifi       className="w-3 h-3" style={{ color: meta.color }} />}
        {d.type === 'hub'  && <Radio      className="w-3 h-3" style={{ color: meta.color }} />}
        <span className="text-[10px] font-display" style={{ color: meta.color }}>{d.protocol}</span>
        <span className="ml-auto text-[9px] font-display text-[var(--color-muted)]">FW {d.firmware}</span>
      </div>

      {/* Position bar (not for hub) */}
      {d.type !== 'hub' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-display uppercase text-[var(--color-muted)]">Position</span>
            <span className="mono text-[10px]" style={{ color: meta.color }}>{d.position}°</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-elevated)] relative overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${d.position}%`, backgroundColor: meta.color, boxShadow: `0 0 6px ${meta.color}80` }}
            />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {d.type !== 'hub' ? (
          <>
            <div className="bg-[var(--color-elevated)] rounded p-2 text-center">
              <div className="text-[8px] font-display text-[var(--color-muted)] uppercase mb-0.5">Torque</div>
              <div className="mono text-sm font-bold text-[var(--color-text)]">{d.torque}</div>
              <div className="text-[8px] text-[var(--color-muted)]">{meta.torqueUnit}</div>
            </div>
            <div className="bg-[var(--color-elevated)] rounded p-2 text-center">
              <div className="text-[8px] font-display text-[var(--color-muted)] uppercase mb-0.5">Max</div>
              <div className="text-xs font-display text-[var(--color-muted)]">{meta.maxLabel}</div>
            </div>
            <div className="bg-[var(--color-elevated)] rounded p-2 text-center">
              <div className="text-[8px] font-display text-[var(--color-muted)] uppercase mb-0.5">Batt</div>
              <div className="mono text-sm font-bold" style={{ color: d.battery > 20 ? 'var(--color-green)' : 'var(--color-red)' }}>{d.battery}%</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[var(--color-elevated)] rounded p-2 text-center">
              <Cpu className="w-4 h-4 mx-auto mb-1 text-[var(--color-purple)]" />
              <div className="text-[8px] font-display text-[var(--color-muted)]">ESP32-C6</div>
            </div>
            <div className="bg-[var(--color-elevated)] rounded p-2 text-center">
              <div className="mono text-sm font-bold text-[var(--color-purple)]">32</div>
              <div className="text-[8px] font-display text-[var(--color-muted)]">Max nodes</div>
            </div>
            <div className="bg-[var(--color-elevated)] rounded p-2 text-center">
              <div className="mono text-sm font-bold text-[var(--color-green)]">2</div>
              <div className="text-[8px] font-display text-[var(--color-muted)]">Connected</div>
            </div>
          </>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => setOnline(o => !o)}
        className="w-full py-1.5 rounded text-xs font-display font-semibold border transition-all"
        style={online
          ? { borderColor: meta.color + '50', color: meta.color, backgroundColor: meta.color + '12' }
          : { borderColor: 'var(--color-border)', color: 'var(--color-muted)', backgroundColor: 'transparent' }}
      >
        {online ? 'Online · Click to disable' : 'Offline · Click to reconnect'}
      </button>
    </div>
  )
}

export function TurnBotPanel() {
  const [devs] = useState(devices)

  const online = devs.filter(d => d.online).length

  return (
    <div>
      <PageHeader
        title="TurnBot Network"
        subtitle="Universal smart rotary actuators · Matter 1.5 / Thread / BLE 5.3"
      />

      <div className="p-6 space-y-6">
        {/* Network summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <div className="text-[10px] font-display uppercase tracking-wide text-[var(--color-muted)] mb-1">Online Devices</div>
            <div className="mono text-2xl font-bold text-[var(--color-green)]">{online}<span className="text-sm text-[var(--color-muted)]"> / {devs.length}</span></div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-display uppercase tracking-wide text-[var(--color-muted)] mb-1">Mesh Nodes</div>
            <div className="mono text-2xl font-bold text-[var(--color-purple)]">2 <span className="text-sm text-[var(--color-muted)]">/ 32 max</span></div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-display uppercase tracking-wide text-[var(--color-muted)] mb-1">Hub Uptime</div>
            <div className="mono text-2xl font-bold text-[var(--color-cyan)]">99.9<span className="text-sm text-[var(--color-muted)]">%</span></div>
          </div>
        </div>

        <SectionLabel>Device Registry</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {devs.map(d => <DeviceCard key={d.id} device={d} />)}
        </div>

        {/* OTA notice */}
        <div className="card p-4 border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-4 h-4 text-[var(--color-cyan)]" />
            <div>
              <div className="text-xs font-display font-semibold text-[var(--color-text)]">OTA Updates</div>
              <div className="text-[10px] text-[var(--color-muted)]">
                All devices on latest firmware. TurnBot Hub FW 3.2.0 supports Matter OTA cluster.
                Next planned update: v3.3.0 — scheduled in 14 days.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
