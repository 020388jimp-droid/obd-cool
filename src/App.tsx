import { useEffect, useState } from 'react'
import {
  Activity,
  Bluetooth,
  BrainCircuit,
  Car,
  ChevronRight,
  Gauge,
  Home,
  ListChecks,
  PlugZap,
  Settings,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import './App.css'
import { ConnectionModal } from './components/ConnectionModal'
import { CodesView } from './components/CodesView'
import { DashboardView } from './components/DashboardView'
import { DiagnosisView } from './components/DiagnosisView'
import { LiveView } from './components/LiveView'
import { RepairView, type RepairTarget } from './components/RepairView'
import { SettingsView } from './components/SettingsView'
import { VehicleView } from './components/VehicleView'
import { ToastStack } from './components/ui'
import { useObd, type CodeWithStatus } from './hooks/useObd'
import { checkAiHealth, requestAiDiagnosis } from './lib/diagnosis/ai'
import { runLocalDiagnosis } from './lib/diagnosis/engine'
import type { DiagnosisResult } from './lib/diagnosis/types'
import {
  DEFAULT_SETTINGS,
  EMPTY_VEHICLE,
  clearLocalData,
  loadSettings,
  loadVehicle,
  saveSettings,
  saveVehicle,
  type AppSettings,
} from './lib/storage'
import type { VehicleInfo } from './lib/obd/types'
import { describeVehicle } from './data/vehicles'
import { NAV_ITEMS, type ViewId } from './types'

const LOGO = `${import.meta.env.BASE_URL}logo.svg`

const NAV_ICONS: Record<ViewId, typeof Home> = {
  dashboard: Home,
  codes: ListChecks,
  live: Gauge,
  diagnosis: BrainCircuit,
  repair: Wrench,
  vehicle: Car,
  settings: Settings,
}

export default function App() {
  const [view, setView] = useState<ViewId>('dashboard')
  const [vehicle, setVehicle] = useState<VehicleInfo>(() => loadVehicle())
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [connectionOpen, setConnectionOpen] = useState(false)
  const [selectedCode, setSelectedCode] = useState<CodeWithStatus | null>(null)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [diagnosing, setDiagnosing] = useState(false)
  const [aiStatus, setAiStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')
  const [repairTarget, setRepairTarget] = useState<RepairTarget | null>(null)

  const obd = useObd(vehicle, settings.pollingMs)
  const connected = obd.connection.status === 'ready'

  const checkAi = () => {
    setAiStatus('checking')
    void checkAiHealth().then((result) => setAiStatus(result.ok ? 'available' : 'unavailable'))
  }

  useEffect(() => {
    checkAi()
    // La comprobación se hace una vez al iniciar; el botón de ajustes permite repetirla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  const navigate = (next: ViewId) => {
    setView(next)
    if (next !== 'codes') setSelectedCode(null)
  }

  const handleSaveVehicle = (next: VehicleInfo) => {
    const changed =
      next.make !== vehicle.make ||
      next.model !== vehicle.model ||
      next.year !== vehicle.year ||
      next.engine !== vehicle.engine ||
      next.vin !== vehicle.vin
    setVehicle(next)
    saveVehicle(next)
    if (changed) {
      // Un diagnóstico calculado con otro vehículo quedaría desactualizado.
      setDiagnosis(null)
      setRepairTarget(null)
    }
    obd.pushToast('ok', 'Vehículo guardado. Los diagnósticos usarán estos datos.')
  }

  const handleSettings = (next: AppSettings) => {
    const aiTurnedOn = !settings.aiEnabled && next.aiEnabled
    setSettings(next)
    saveSettings(next)
    if (aiTurnedOn) checkAi()
  }

  const handleClearData = () => {
    clearLocalData()
    setVehicle(EMPTY_VEHICLE)
    setSettings(DEFAULT_SETTINGS)
    setSymptoms([])
    setDiagnosis(null)
    setRepairTarget(null)
    obd.pushToast('ok', 'Datos locales borrados.')
  }

  const handleRunDiagnosis = async (mode: 'local' | 'ai') => {
    const context = {
      vehicle,
      codes: obd.codes,
      snapshot: obd.snapshot(),
      symptoms,
      freezeFrame: obd.freezeFrame,
    }
    const local = runLocalDiagnosis(context)
    setView('diagnosis')

    if (mode === 'local') {
      setDiagnosis(local)
      obd.pushToast('ok', 'Análisis local completado.')
      return
    }

    setDiagnosing(true)
    try {
      const ai = await requestAiDiagnosis(context)
      setDiagnosis({
        ...ai,
        safety: [...new Set([...ai.safety, ...local.safety])],
        notes: [...ai.notes, ...local.notes],
        freezeFrame: local.freezeFrame,
      })
      obd.pushToast('ok', 'Diagnóstico con IA completado.')
    } catch (error) {
      setDiagnosis(local)
      obd.pushToast('error', `${(error as Error).message} Se muestra el análisis local.`)
    } finally {
      setDiagnosing(false)
    }
  }

  const openRepair = (target: RepairTarget) => {
    setRepairTarget(target)
    setSelectedCode(null)
    setView('repair')
    window.scrollTo(0, 0)
  }

  const toggleSymptom = (id: string) => {
    setSymptoms((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const aiAvailable = settings.aiEnabled && aiStatus === 'available'
  const bottomItems = NAV_ITEMS.filter((item) =>
    ['dashboard', 'codes', 'live', 'diagnosis', 'repair'].includes(item.id),
  )

  return (
    <div className="app">
      <aside className="sidebar">
        <button type="button" className="brand" onClick={() => navigate('dashboard')}>
          <img src={LOGO} alt="OBD COOL" width={44} height={44} />
          <span>
            <strong>OBD COOL</strong>
            <small>Diagnóstico OBD-II</small>
          </span>
        </button>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.id]
            const active = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${active ? 'is-active' : ''}`}
                onClick={() => navigate(item.id)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === 'codes' && obd.codes.length > 0 && <span className="nav-count">{obd.codes.length}</span>}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className={`sidebar-connection ${connected ? 'is-ready' : ''}`}>
            <span className="status-dot" />
            <div>
              <strong>{connected ? 'ELM327 conectado' : 'Sin adaptador'}</strong>
              <small>{connected ? obd.connection.deviceName : 'Modo local disponible'}</small>
            </div>
          </div>
          <p>
            <ShieldCheck size={14} /> Funciona offline. Tus datos se quedan en este dispositivo.
          </p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="mobile-brand" onClick={() => navigate('dashboard')}>
            <img src={LOGO} alt="" width={30} height={30} />
            <strong>OBD COOL</strong>
          </button>

          <button type="button" className="vehicle-pill" onClick={() => navigate('vehicle')}>
            <Car size={17} />
            <span>{describeVehicle(vehicle)}</span>
            <ChevronRight size={14} />
          </button>

          <div className="topbar__actions">
            <button
              type="button"
              className={`connection-pill connection-pill--${obd.connection.status}`}
              onClick={() => setConnectionOpen(true)}
            >
              <span className="status-dot" />
              {connected ? <Bluetooth size={15} /> : <PlugZap size={15} />}
              <span className="connection-pill__label">
                {connected
                  ? obd.connection.deviceName
                  : obd.connection.status === 'connecting'
                    ? 'Conectando…'
                    : 'Conectar'}
              </span>
            </button>
            <button
              type="button"
              className={`icon-button ${view === 'settings' ? 'is-active' : ''}`}
              onClick={() => navigate('settings')}
              aria-label="Ajustes"
            >
              <Settings size={19} />
            </button>
          </div>
        </header>

        <main className="content">
          {view === 'dashboard' && (
            <DashboardView
              obd={obd}
              vehicle={vehicle}
              diagnosis={diagnosis}
              onOpenConnection={() => setConnectionOpen(true)}
              onNavigate={navigate}
              onSelectCode={(code) => {
                setSelectedCode(code)
                setView('codes')
              }}
            />
          )}

          {view === 'codes' && (
            <CodesView
              obd={obd}
              vehicle={vehicle}
              selected={selectedCode}
              onSelect={setSelectedCode}
              onCloseSelected={() => setSelectedCode(null)}
              onOpenRepair={openRepair}
              onDiagnose={() => setView('diagnosis')}
            />
          )}

          {view === 'live' && <LiveView obd={obd} />}

          {view === 'diagnosis' && (
            <DiagnosisView
              obd={obd}
              vehicle={vehicle}
              diagnosis={diagnosis}
              diagnosing={diagnosing}
              symptoms={symptoms}
              onToggleSymptom={toggleSymptom}
              onClearSymptoms={() => setSymptoms([])}
              onRunDiagnosis={(mode) => void handleRunDiagnosis(mode)}
              onOpenRepair={openRepair}
              aiAvailable={aiAvailable}
            />
          )}

          {view === 'repair' && (
            <RepairView
              target={repairTarget}
              onClearTarget={() => setRepairTarget(null)}
            />
          )}

          {view === 'vehicle' && <VehicleView vehicle={vehicle} onSave={handleSaveVehicle} />}

          {view === 'settings' && (
            <SettingsView
              settings={settings}
              onChange={handleSettings}
              obd={obd}
              aiStatus={aiStatus}
              onCheckAi={checkAi}
              onClearData={handleClearData}
            />
          )}

          <footer className="app-footer">
            <span>
              <ShieldCheck size={14} /> OBD COOL · Diagnóstico orientativo · No sustituye al taller
            </span>
            <span className="app-footer__links">
              <a href="https://es.ifixit.com/Device/Car_and_Truck" target="_blank" rel="noreferrer">
                iFixit
              </a>
              <button type="button" onClick={() => navigate('settings')}>
                Privacidad
              </button>
            </span>
          </footer>
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegación rápida">
        {bottomItems.map((item) => {
          const Icon = NAV_ICONS[item.id]
          const active = view === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`bottom-nav__item ${active ? 'is-active' : ''}`}
              onClick={() => navigate(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{item.shortLabel}</span>
              {item.id === 'codes' && obd.codes.length > 0 && <span className="bottom-nav__count">{obd.codes.length}</span>}
            </button>
          )
        })}
      </nav>

      <ConnectionModal open={connectionOpen} onClose={() => setConnectionOpen(false)} obd={obd} />
      <ToastStack toasts={obd.toasts} onDismiss={obd.dismissToast} />

      {obd.connection.error && !connectionOpen && (
        <button type="button" className="floating-error" onClick={() => setConnectionOpen(true)}>
          <Activity size={16} />
          <span>{obd.connection.error.message}</span>
          <span className="floating-error__cta">Revisar</span>
        </button>
      )}

      {view === 'dashboard' && !connected && (
        <button type="button" className="floating-connect" onClick={() => setConnectionOpen(true)}>
          <Sparkles size={16} /> Probar con el simulador
        </button>
      )}
    </div>
  )
}
