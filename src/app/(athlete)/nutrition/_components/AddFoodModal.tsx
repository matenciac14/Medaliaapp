'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Camera, PenLine, Loader2, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import type { FoodItem } from './FoodGuide'

type Tab = 'photo' | 'manual'

type FormData = {
  name: string
  category: string
  kcalPer100g: string
  proteinPer100g: string
  carbsPer100g: string
  fatPer100g: string
  fiberPer100g: string
  calciumMg: string
  ironMg: string
  potassiumMg: string
  vitaminCMg: string
  magnesiumMg: string
  servingG: string
  servingLabel: string
}

const EMPTY_FORM: FormData = {
  name: '', category: 'PROTEIN',
  kcalPer100g: '', proteinPer100g: '', carbsPer100g: '', fatPer100g: '',
  fiberPer100g: '', calciumMg: '', ironMg: '', potassiumMg: '', vitaminCMg: '', magnesiumMg: '',
  servingG: '100', servingLabel: '',
}

const CATEGORIES = [
  { value: 'PROTEIN',   label: '🥩 Proteínas' },
  { value: 'DAIRY',     label: '🥛 Lácteos' },
  { value: 'LEGUME',    label: '🫘 Legumbres' },
  { value: 'CARB',      label: '🍚 Carbohidratos' },
  { value: 'FRUIT',     label: '🍌 Frutas' },
  { value: 'FAT',       label: '🥑 Grasas' },
  { value: 'VEGETABLE', label: '🥦 Vegetales' },
]

function Field({
  label, name, value, onChange, required, placeholder, suffix,
}: {
  label: string
  name: keyof FormData
  value: string
  onChange: (name: keyof FormData, v: string) => void
  required?: boolean
  placeholder?: string
  suffix?: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 block mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          min={0}
          step="0.1"
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder ?? '0'}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
        )}
      </div>
    </div>
  )
}

export default function AddFoodModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (food: FoodItem) => void
}) {
  const [tab, setTab] = useState<Tab>('photo')
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState<string>('image/jpeg')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateField = useCallback((name: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }, [])

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImageMime(file.type || 'image/jpeg')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setImagePreview(dataUrl)
      // Extract base64 part (after "data:image/...;base64,")
      const base64 = dataUrl.split(',')[1]
      setImageBase64(base64)
      setScanned(false)
      setScanError(null)
    }
    reader.readAsDataURL(file)
  }

  async function handleScan() {
    if (!imageBase64) return
    setScanning(true)
    setScanError(null)
    try {
      const res = await fetch('/api/nutrition/foods/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, mimeType: imageMime }),
      })
      if (!res.ok) throw new Error('No se pudo procesar la imagen')
      const data = await res.json()

      setForm({
        name:           data.name          ?? '',
        category:       data.category      ?? 'PROTEIN',
        kcalPer100g:    data.kcalPer100g   != null ? String(data.kcalPer100g)    : '',
        proteinPer100g: data.proteinPer100g != null ? String(data.proteinPer100g) : '',
        carbsPer100g:   data.carbsPer100g  != null ? String(data.carbsPer100g)   : '',
        fatPer100g:     data.fatPer100g    != null ? String(data.fatPer100g)     : '',
        fiberPer100g:   data.fiberPer100g  != null ? String(data.fiberPer100g)   : '',
        calciumMg:      data.calciumMg     != null ? String(data.calciumMg)      : '',
        ironMg:         data.ironMg        != null ? String(data.ironMg)         : '',
        potassiumMg:    data.potassiumMg   != null ? String(data.potassiumMg)    : '',
        vitaminCMg:     data.vitaminCMg    != null ? String(data.vitaminCMg)     : '',
        magnesiumMg:    data.magnesiumMg   != null ? String(data.magnesiumMg)    : '',
        servingG:       data.servingG      != null ? String(data.servingG)       : '100',
        servingLabel:   data.servingLabel  ?? '',
      })
      setScanned(true)
    } catch {
      setScanError('No se pudo leer la etiqueta. Intenta con una imagen más clara o ingresa los datos manualmente.')
    } finally {
      setScanning(false)
    }
  }

  async function handleSave() {
    if (!form.name || !form.kcalPer100g || !form.proteinPer100g || !form.carbsPer100g || !form.fatPer100g) {
      setSaveError('Completa los campos obligatorios: nombre, calorías y macros principales.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/nutrition/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          kcalPer100g:    parseFloat(form.kcalPer100g),
          proteinPer100g: parseFloat(form.proteinPer100g),
          carbsPer100g:   parseFloat(form.carbsPer100g),
          fatPer100g:     parseFloat(form.fatPer100g),
          fiberPer100g:   form.fiberPer100g   ? parseFloat(form.fiberPer100g)   : null,
          calciumMg:      form.calciumMg      ? parseFloat(form.calciumMg)      : null,
          ironMg:         form.ironMg         ? parseFloat(form.ironMg)         : null,
          potassiumMg:    form.potassiumMg    ? parseFloat(form.potassiumMg)    : null,
          vitaminCMg:     form.vitaminCMg     ? parseFloat(form.vitaminCMg)     : null,
          magnesiumMg:    form.magnesiumMg    ? parseFloat(form.magnesiumMg)    : null,
          servingG:       parseFloat(form.servingG) || 100,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      const food: FoodItem = await res.json()
      onAdd(food)
      onClose()
    } catch {
      setSaveError('Error al guardar el alimento. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const showForm = tab === 'manual' || scanned

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Agregar alimento</h2>
            <p className="text-xs text-gray-500 mt-0.5">Aparecerá en la guía para todos los usuarios</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          <button
            onClick={() => setTab('photo')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              tab === 'photo' ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Camera size={15} />
            Escanear foto
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              tab === 'manual' ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <PenLine size={15} />
            Manual
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Photo tab */}
          {tab === 'photo' && (
            <div className="space-y-3">
              {/* Upload area */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
              />

              {!imagePreview ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-[#1e3a5f]/40 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center">
                    <Upload size={22} className="text-[#1e3a5f]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">Sube una foto de la etiqueta</p>
                    <p className="text-xs text-gray-400 mt-0.5">Toca para tomar foto o seleccionar archivo</p>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Preview */}
                  <div className="relative rounded-xl overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Etiqueta nutricional" className="w-full max-h-48 object-contain" />
                    <button
                      onClick={() => { setImagePreview(null); setImageBase64(null); setScanned(false); setScanError(null) }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <X size={13} className="text-white" />
                    </button>
                  </div>

                  {/* Scan button */}
                  {!scanned && (
                    <button
                      onClick={handleScan}
                      disabled={scanning}
                      className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {scanning ? (
                        <><Loader2 size={15} className="animate-spin" /> Analizando etiqueta...</>
                      ) : (
                        <><Camera size={15} /> Extraer datos nutricionales</>
                      )}
                    </button>
                  )}

                  {scanned && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                      <p className="text-sm text-green-700 font-medium">Datos extraídos — revisa y guarda</p>
                      <button
                        onClick={() => { setScanned(false); setScanError(null) }}
                        className="ml-auto text-xs text-green-600 hover:underline"
                      >
                        Volver a escanear
                      </button>
                    </div>
                  )}

                  {scanError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                      <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{scanError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form — shown in manual tab OR after a successful scan */}
          {showForm && (
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Nombre del alimento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="ej: Pechuga de pollo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Categoría <span className="text-red-500">*</span></label>
                <select
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Macros — required */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Macros por 100g <span className="text-red-500">*</span></p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Calorías" name="kcalPer100g" value={form.kcalPer100g} onChange={updateField} required suffix="kcal" />
                  <Field label="Proteína" name="proteinPer100g" value={form.proteinPer100g} onChange={updateField} required suffix="g" />
                  <Field label="Carbohidratos" name="carbsPer100g" value={form.carbsPer100g} onChange={updateField} required suffix="g" />
                  <Field label="Grasas" name="fatPer100g" value={form.fatPer100g} onChange={updateField} required suffix="g" />
                </div>
              </div>

              {/* Micronutrients — optional */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Micronutrientes (opcional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Fibra" name="fiberPer100g" value={form.fiberPer100g} onChange={updateField} suffix="g" />
                  <Field label="Calcio" name="calciumMg" value={form.calciumMg} onChange={updateField} suffix="mg" />
                  <Field label="Hierro" name="ironMg" value={form.ironMg} onChange={updateField} suffix="mg" />
                  <Field label="Potasio" name="potassiumMg" value={form.potassiumMg} onChange={updateField} suffix="mg" />
                  <Field label="Vitamina C" name="vitaminCMg" value={form.vitaminCMg} onChange={updateField} suffix="mg" />
                  <Field label="Magnesio" name="magnesiumMg" value={form.magnesiumMg} onChange={updateField} suffix="mg" />
                </div>
              </div>

              {/* Serving */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Porción típica</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Gramos por porción" name="servingG" value={form.servingG} onChange={updateField} suffix="g" />
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Descripción</label>
                    <input
                      type="text"
                      value={form.servingLabel}
                      onChange={(e) => updateField('servingLabel', e.target.value)}
                      placeholder="ej: 1 pechuga"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                    />
                  </div>
                </div>
              </div>

              {saveError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{saveError}</p>
                </div>
              )}
            </div>
          )}

          {/* Empty manual state hint */}
          {tab === 'photo' && !showForm && !imagePreview && (
            <p className="text-xs text-gray-400 text-center pt-1">
              O cambia a la pestaña <span className="font-semibold">Manual</span> para ingresar los datos directamente
            </p>
          )}
        </div>

        {/* Footer */}
        {showForm && (
          <div className="px-5 py-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#f97316] hover:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              Guardar alimento
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Quedará pendiente de verificación · Visible de inmediato para ti y otros usuarios
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
