
import RevealOnScroll from "./_components/RevealOnScroll";
import { getT } from "@/lib/i18n/server";
import LanguageSwitcher from "./_components/LanguageSwitcher";
import ProfileTabs from "./_components/ProfileTabs";

export default async function Home() {
  const t = await getT()
  const l = t.landing

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          70%  { box-shadow: 0 0 0 10px rgba(249,115,22,0); }
          100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
        }
        .anim-fade-up   { animation: fadeUp 0.7s ease both; }
        .anim-fade-in   { animation: fadeIn 0.7s ease both; }
        .anim-float     { animation: float 3.5s ease-in-out infinite; }
        .anim-pulse-cta { animation: pulse-ring 2s ease-in-out infinite; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-600 { animation-delay: 600ms; }
      `}</style>

      {/* 1 · Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-2xl font-bold text-[#1e3a5f]">Medaliq</span>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#como-funciona" className="hover:text-[#1e3a5f] transition-colors">{l.nav.howItWorks}</a>
            <a href="#precios" className="hover:text-[#1e3a5f] transition-colors">{l.nav.pricing}</a>
            <a href="#entrenadores" className="hover:text-[#1e3a5f] transition-colors">{l.nav.forTrainers}</a>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" />
            <a href="/login" className="hidden sm:block text-xs text-gray-400 hover:text-gray-700 transition-colors">
              Iniciar sesión
            </a>
            <a href="/register">
              <button className="bg-[#f97316] hover:bg-[#ea6c0a] text-white font-semibold px-5 py-2 rounded-lg transition-transform hover:scale-105 active:scale-95 text-sm">
                {l.nav.cta}
              </button>
            </a>
          </div>
        </div>
      </nav>

      {/* 2 · Hero — foto + overlay + contenido izquierdo */}
      <section className="relative overflow-hidden" style={{ minHeight: '680px' }}>
        {/* Foto de fondo */}
        <img
          src="/hero-coach.jpg"
          alt="Coach con atleta"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlay izquierdo (navy fuerte → transparente) */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(15,34,64,0.95) 0%, rgba(30,58,95,0.75) 45%, rgba(30,58,95,0.25) 100%)' }} />
        {/* Overlay inferior sutil */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(15,34,64,0.4) 100%)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-16 py-28 lg:py-36 flex items-center gap-12 min-h-[680px]">
          {/* Contenido izquierdo */}
          <div className="w-full lg:max-w-[580px]">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-7 anim-fade-up">
              {[l.hero.badge1, l.hero.badge2, l.hero.badge3].map((badge) => (
                <span key={badge} className="bg-white/12 border border-white/25 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm">
                  {badge}
                </span>
              ))}
            </div>

            {/* H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold leading-tight tracking-tight text-white mb-5 anim-fade-up delay-100">
              {l.hero.title}{' '}
              <span className="text-[#f97316]">{l.hero.titleHighlight}</span>
            </h1>

            {/* Subtítulo */}
            <p className="text-base sm:text-lg text-blue-100 leading-relaxed mb-8 max-w-lg anim-fade-up delay-200">
              {l.hero.subtitle}
            </p>

            {/* CTA */}
            <div className="flex flex-col items-start gap-3 anim-fade-up delay-300">
              <a href="/register">
                <button className="anim-pulse-cta bg-[#f97316] hover:bg-[#ea6c0a] text-white font-bold px-9 py-4 rounded-xl text-base transition-transform hover:scale-105 active:scale-95">
                  {l.hero.cta1}
                </button>
              </a>
              <p className="text-blue-300/70 text-xs">8 entrenadores ya reservaron su lugar.</p>
              <a href="#como-funciona" className="text-blue-300 hover:text-white text-sm transition-colors">
                {l.hero.cta2}
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-10 anim-fade-in delay-500">
              {[
                { value: '30 días', label: l.hero.stat1Label },
                { value: '0%', label: l.hero.stat2Label },
                { value: '5', label: l.hero.stat3Label },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-extrabold text-[#f97316]">{value}</div>
                  <div className="text-xs text-blue-300 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cards flotantes (solo desktop) */}
          <div className="hidden lg:flex flex-col gap-4 ml-auto anim-fade-in delay-400">
            {/* Card: Pago confirmado */}
            <div className="bg-white/12 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-3.5 flex items-center gap-3 anim-float">
              <div className="w-7 h-7 rounded-full bg-[rgba(52,211,153,0.22)] flex items-center justify-center shrink-0">
                <span className="text-[#34d399] font-bold text-sm">✓</span>
              </div>
              <div>
                <p className="text-white text-xs font-semibold">Pago confirmado</p>
                <p className="text-blue-200 text-[11px]">Ana G. · $180.000 COP</p>
              </div>
            </div>
            {/* Card: Sesión de hoy */}
            <div className="bg-white/12 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-3.5 flex flex-col gap-1.5" style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#f97316]" />
                <span className="text-blue-200 text-[10px] font-semibold tracking-widest uppercase">Sesión de hoy</span>
              </div>
              <p className="text-white text-[13px] font-bold">Intervalos 4×8 · Zona 3</p>
              <p className="text-blue-200 text-[11px]">Adherencia 92% · FC ↓3bpm</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2b · Franja científica */}
      <section className="bg-white border-b border-gray-100 py-10 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <p className="text-gray-400 text-xs font-semibold tracking-[0.12em] uppercase text-center">
            {l.science.label}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {[
              { title: l.science.item1Title, sub: l.science.item1Sub, icon: '🫀' },
              { title: l.science.item2Title, sub: l.science.item2Sub, icon: '⚡' },
              { title: l.science.item3Title, sub: l.science.item3Sub, icon: '📈' },
              { title: l.science.item4Title, sub: l.science.item4Sub, icon: '💰' },
            ].map((item, i) => (
              <div key={item.title} className="flex items-center gap-3">
                {i > 0 && <div className="hidden sm:block w-px h-8 bg-gray-200 mr-4" />}
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-[#1e3a5f] text-sm font-bold leading-tight">{item.title}</p>
                  <p className="text-gray-500 text-xs">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2c · El caos de hoy (Pain) */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4 max-w-2xl mx-auto leading-tight">
              {l.pain.title}
            </h2>
            <p className="text-gray-500 text-base mb-12">{l.pain.subtitle}</p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {[
              { title: l.pain.card1Title, desc: l.pain.card1Desc, delay: 0 },
              { title: l.pain.card2Title, desc: l.pain.card2Desc, delay: 100 },
              { title: l.pain.card3Title, desc: l.pain.card3Desc, delay: 200 },
            ].map((card) => (
              <RevealOnScroll key={card.title} delay={card.delay}>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-left h-full">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                    <span className="text-red-500 text-lg">✕</span>
                  </div>
                  <h3 className="text-[#1e3a5f] font-bold text-base mb-2">{card.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
          <RevealOnScroll delay={150}>
            <div className="inline-flex items-center gap-2 bg-[#1e3a5f]/06 px-6 py-3.5 rounded-full">
              <p className="text-[#1e3a5f] font-semibold text-base">
                Medaliq reemplaza tu Excel y tus WhatsApps con{' '}
                <span className="text-[#f97316]">un solo panel.</span>
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* 3 · Profiles */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-[#1e3a5f] mb-4">
              {l.profiles.title}
            </h2>
            <p className="text-center text-gray-500 mb-12 text-base">{l.profiles.subtitle}</p>
          </RevealOnScroll>
          <RevealOnScroll delay={100}>
            <ProfileTabs
              ctaLabel={l.hero.cta1}
              tabs={[
                {
                  label: l.profiles.tab2Label,
                  title: l.profiles.tab2Title,
                  desc: l.profiles.tab2Desc,
                  gets: l.profiles.tab2Gets,
                },
                {
                  label: l.profiles.tab1Label,
                  title: l.profiles.tab1Title,
                  desc: l.profiles.tab1Desc,
                  gets: l.profiles.tab1Gets,
                },
              ]}
            />
          </RevealOnScroll>
        </div>
      </section>

      {/* 4 · Para Entrenadores */}
      <section id="entrenadores" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <div className="inline-block bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
                {l.forCoaches.badge}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4 max-w-2xl mx-auto leading-tight">
                {l.forCoaches.title}
              </h2>
              <p className="text-gray-500 text-base max-w-xl mx-auto">
                {l.forCoaches.subtitle}
              </p>
            </div>
          </RevealOnScroll>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {[
              { icon: '📈', title: l.forCoaches.card1Title, desc: l.forCoaches.card1Desc, delay: 0 },
              { icon: '📱', title: l.forCoaches.card2Title, desc: l.forCoaches.card2Desc, delay: 100 },
              { icon: '💰', title: l.forCoaches.card3Title, desc: l.forCoaches.card3Desc, delay: 200 },
            ].map((card) => (
              <RevealOnScroll key={card.title} delay={card.delay}>
                <div className="bg-gray-50 rounded-2xl p-6 text-left h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="w-11 h-11 rounded-xl bg-[rgba(249,115,22,0.12)] flex items-center justify-center mb-4 text-xl">
                    {card.icon}
                  </div>
                  <h3 className="text-base font-bold text-[#1e3a5f] mb-2">{card.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          {/* Mockup panel del coach */}
          <RevealOnScroll delay={100}>
            <div className="rounded-2xl overflow-hidden shadow-[0px_28px_56px_-14px_rgba(0,0,0,0.18)] border border-gray-200 mb-10">
              {/* Browser topbar */}
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 max-w-xs mx-auto bg-white rounded-md px-3 py-1 text-xs text-gray-500 text-center">
                  🔒 medaliq.com/coach/dashboard
                </div>
              </div>
              {/* App body */}
              <div className="flex" style={{ height: '320px' }}>
                {/* Sidebar */}
                <div className="w-44 bg-[#1e3a5f] shrink-0 flex flex-col p-3">
                  <span className="text-white font-extrabold text-base mb-5 pl-1">Medaliq</span>
                  <div className="bg-[rgba(249,115,22,0.16)] rounded-lg px-3 py-2 text-white text-xs font-semibold flex items-center gap-2 mb-1">
                    <span>📊</span> Dashboard
                  </div>
                  {[['👥', 'Atletas'], ['📅', 'Rutinas'], ['💬', 'Mensajes'], ['💰', 'Finanzas']].map(([icon, name]) => (
                    <div key={name} className="px-3 py-2 text-blue-200 text-xs flex items-center gap-2 rounded-lg">
                      <span>{icon}</span> {name}
                    </div>
                  ))}
                </div>
                {/* Main */}
                <div className="flex-1 bg-gray-50 p-5 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-[#1e3a5f]">Mis atletas</h4>
                    <button className="bg-[#f97316] text-white text-xs font-semibold px-3 py-1 rounded-lg">+ Invitar</button>
                  </div>
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[['23', 'Atletas'], ['18', 'Activos'], ['$2.4M', 'Ingresos COP'], ['92%', 'Adherencia']].map(([v, label]) => (
                      <div key={label} className="bg-white rounded-xl p-2.5 text-center border border-gray-100">
                        <div className="text-sm font-extrabold text-[#1e3a5f]">{v}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Table */}
                  <div className="space-y-1.5">
                    {[
                      { name: 'Alejandro', sport: 'Running', pct: 78 },
                      { name: 'Carlos López', sport: 'Gym', pct: 95 },
                      { name: 'Laura Gómez', sport: 'Running', pct: 61 },
                      { name: 'Alan Bel', sport: 'Gym', pct: 88 },
                    ].map(({ name, sport, pct }) => (
                      <div key={name} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-gray-50">
                        <div className="w-6 h-6 rounded-full bg-[#1e3a5f]/15 flex items-center justify-center text-[9px] font-bold text-[#1e3a5f] shrink-0">
                          {name[0]}
                        </div>
                        <span className="flex-1 text-xs text-gray-700 font-medium">{name}</span>
                        <span className="text-[10px] text-gray-400 w-12">{sport}</span>
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${pct > 80 ? 'bg-green-500' : pct > 60 ? 'bg-orange-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-semibold w-8 text-right ${pct > 80 ? 'text-green-600' : pct > 60 ? 'text-orange-500' : 'text-red-500'}`}>
                          {pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={150}>
            <div className="text-center">
              <a href="/register">
                <button className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold px-8 py-3 rounded-xl transition-transform hover:scale-105 active:scale-95">
                  {l.forCoaches.cta}
                </button>
              </a>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* 5 · Features — Lo que tus atletas van a recibir */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4 leading-tight">
              {l.features.title}
            </h2>
            <p className="text-gray-500 mb-8 text-base leading-relaxed">
              {l.features.subtitle}
            </p>
            <ul className="space-y-4">
              {[
                { icon: '🔍', text: l.features.item1 },
                { icon: '❤️', text: l.features.item2 },
                { icon: '🥗', text: l.features.item3 },
                { icon: '📋', text: l.features.item4 },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 group">
                  <span className="text-xl shrink-0 group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                  <span className="text-gray-700 text-sm leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
          </RevealOnScroll>

          {/* App Mockup */}
          <RevealOnScroll delay={150}>
            <div className="bg-[#1e3a5f] rounded-2xl p-6 text-white shadow-2xl anim-float">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-semibold text-blue-200 uppercase tracking-widest">{l.features.sessionLabel}</span>
                <span className="bg-[#f97316] text-white text-xs font-bold px-2 py-1 rounded-full">Zona 3</span>
              </div>
              <h4 className="text-lg font-bold mb-1">{l.features.sessionTitle}</h4>
              <p className="text-blue-200 text-xs mb-6">Martes · {l.features.weekLabel}</p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { value: '68', label: 'FC reposo' },
                  { value: '7.2h', label: 'Sueño' },
                  { value: '92%', label: 'Adherencia' },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-white/10 rounded-xl p-3 text-center hover:bg-white/15 transition-colors">
                    <div className="text-xl font-bold text-[#f97316]">{value}</div>
                    <div className="text-xs text-blue-200 mt-1">{label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-sm text-blue-100 leading-relaxed">
                <span className="text-[#f97316] font-semibold">📊 Resumen: </span>
                {l.features.aiMsg}
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* 6 · Cómo funciona */}
      <section id="como-funciona" className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-[#1e3a5f] mb-4">
              {l.howItWorks.title}
            </h2>
            <p className="text-center text-gray-500 mb-14 text-base">{l.howItWorks.subtitle}</p>
          </RevealOnScroll>
          <div className="flex flex-col gap-0">
            {[
              { step: '1', title: l.howItWorks.step1Title, desc: l.howItWorks.step1Desc, delay: 0 },
              { step: '2', title: l.howItWorks.step2Title, desc: l.howItWorks.step2Desc, delay: 120 },
              { step: '3', title: l.howItWorks.step3Title, desc: l.howItWorks.step3Desc, delay: 240 },
            ].map((item, idx) => (
              <RevealOnScroll key={item.step} delay={item.delay}>
                <div className="flex gap-5 group">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-sm font-bold group-hover:bg-[#f97316] transition-colors duration-300 z-10">
                      {item.step}
                    </div>
                    {idx < 2 && (
                      <div className="w-0.5 flex-1 bg-gradient-to-b from-[#1e3a5f]/30 to-transparent my-1" style={{ minHeight: '2.5rem' }} />
                    )}
                  </div>
                  <div className="pb-8">
                    <h3 className="text-base font-bold text-[#1e3a5f] mt-2 mb-1">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* 7b · Testimonios */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4">{l.testimonials.title}</h2>
            <p className="text-gray-500 text-base mb-12">{l.testimonials.subtitle}</p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: l.testimonials.t1Quote, name: l.testimonials.t1Name, role: l.testimonials.t1Role, initials: 'AM', color: '#1e3a5f', bg: 'rgba(30,58,95,0.15)', delay: 0 },
              { quote: l.testimonials.t2Quote, name: l.testimonials.t2Name, role: l.testimonials.t2Role, initials: 'VR', color: '#f97316', bg: 'rgba(249,115,22,0.15)', delay: 100 },
              { quote: l.testimonials.t3Quote, name: l.testimonials.t3Name, role: l.testimonials.t3Role, initials: 'ST', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', delay: 200 },
            ].map((t) => (
              <RevealOnScroll key={t.name} delay={t.delay}>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 text-left flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-[#f97316] font-bold text-sm mb-3">★★★★★</p>
                  <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-5">{t.quote}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: t.bg, color: t.color }}>
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-[#1e3a5f] font-bold text-sm">{t.name}</p>
                      <p className="text-gray-500 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* 7 · Pricing */}
      <section id="precios" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto text-center">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4">{l.pricing.title}</h2>
            <p className="text-gray-500 mb-3 text-base">{l.pricing.subtitle}</p>
            <span className="inline-block bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full mb-10 tracking-widest uppercase">
              💵 Precios en USD
            </span>
          </RevealOnScroll>

          {/* Coach tiers */}
          <RevealOnScroll>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow p-6 md:p-8 text-left mb-6">
              <div className="mb-5">
                <div className="inline-block bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-2">
                  {l.pricing.forCoachesLabel}
                </div>
                <h3 className="text-lg font-bold text-[#1e3a5f] mb-1">{l.pricing.coachTiersTitle}</h3>
                <p className="text-sm text-gray-500">{l.pricing.coachTiersSubtitle}</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { name: 'STARTER', price: 'Gratis', athletes: '≤ 5 asesorados', highlight: false },
                  { name: 'GROWTH',  price: '$39/mes', athletes: '6 – 25 asesorados', highlight: true },
                  { name: 'PRO',     price: '$79/mes', athletes: '26 – 75 asesorados', highlight: false },
                  { name: 'SCALE',   price: '$129/mes', athletes: '+75 asesorados', highlight: false },
                ].map((tier) => (
                  <div key={tier.name} className={`relative rounded-xl p-4 text-center border ${tier.highlight ? 'bg-[rgba(249,115,22,0.06)] border-[#f97316]' : 'bg-gray-50 border-gray-100'}`}>
                    {tier.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="bg-[#f97316] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">MÁS POPULAR</span>
                      </div>
                    )}
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{tier.name}</div>
                    <div className="text-xl font-extrabold text-[#1e3a5f] mb-1">{tier.price}</div>
                    <div className="text-xs text-gray-500">{tier.athletes}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-6">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6">
                  {[l.pricing.coachF1, l.pricing.coachF2, l.pricing.coachF3, l.pricing.coachF4, l.pricing.coachF5].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500 shrink-0">✓</span> {f}
                    </div>
                  ))}
                </div>
                <div className="shrink-0">
                  <a href="/register">
                    <button className="border border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white font-semibold transition-colors whitespace-nowrap px-6 py-2.5 rounded-lg">
                      {l.pricing.coachCta}
                    </button>
                  </a>
                </div>
              </div>
            </div>
          </RevealOnScroll>

          {/* Separador atletas */}
          <div className="flex items-center gap-4 max-w-2xl mx-auto mb-8">
            <hr className="flex-1 border-gray-200" />
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Para atletas</span>
            <hr className="flex-1 border-gray-200" />
          </div>

          {/* Atletas Free + Pro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <RevealOnScroll>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-left flex flex-col hover:shadow-md transition-shadow h-full">
                <div className="mb-5">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{l.pricing.freeLabel}</span>
                  <div className="text-4xl font-extrabold text-[#1e3a5f] mt-2">
                    $0 <span className="text-xs text-gray-400 font-normal">USD</span>
                  </div>
                  <div className="text-gray-400 text-sm">{l.pricing.freePeriod}</div>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 flex-1 mb-6">
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {l.pricing.freeF1}</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {l.pricing.freeF2}</li>
                  <li className="flex items-center gap-2 text-gray-300"><span>✗</span> {l.pricing.freeF3}</li>
                  <li className="flex items-center gap-2 text-gray-300"><span>✗</span> {l.pricing.freeF4}</li>
                  <li className="flex items-center gap-2 text-gray-300"><span>✗</span> {l.pricing.freeF5}</li>
                </ul>
                <a href="/register">
                  <button className="w-full py-2.5 rounded-lg border border-gray-200 text-[#1e3a5f] hover:bg-gray-50 font-semibold text-sm transition-colors">
                    {l.pricing.freeCta}
                  </button>
                </a>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={80}>
              <div className="rounded-2xl p-6 border-2 border-[#f97316] shadow-xl text-left flex flex-col relative hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 h-full"
                style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2240 100%)' }}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-[#f97316] text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                    {l.pricing.popular}
                  </span>
                </div>
                <div className="mb-5">
                  <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">{l.pricing.proLabel}</span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <div className="text-4xl font-extrabold text-white">$9.99</div>
                    <div className="text-blue-300/60 text-xs font-normal">USD</div>
                    <div className="text-blue-300 text-sm pb-0.5">/ {l.pricing.proPeriod}</div>
                  </div>
                  <div className="text-blue-400 text-xs mt-1">
                    $79.99/año · <span className="text-[#f97316] font-semibold">30 días gratis para probar</span>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-blue-100 flex-1 mb-6">
                  {[l.pricing.proF1, l.pricing.proF2, l.pricing.proF3, l.pricing.proF4, l.pricing.proF5].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-[#f97316]">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href="/register">
                  <button className="w-full bg-[#f97316] hover:bg-[#ea6c0a] text-white font-bold py-3 rounded-xl transition-transform hover:scale-105 active:scale-95 anim-pulse-cta">
                    {l.pricing.proCta}
                  </button>
                </a>
                <p className="text-center text-blue-400 text-xs mt-3">Sin tarjeta · Cancela cuando quieras.</p>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* 9b · Garantía + FAQ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-[#1e3a5f] mb-4">{l.guarantee.title}</h2>
            <p className="text-center text-gray-500 text-base mb-10">{l.guarantee.subtitle}</p>
          </RevealOnScroll>

          {/* Banda garantía */}
          <RevealOnScroll delay={50}>
            <div className="bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.3)] rounded-2xl px-7 py-6 flex items-start gap-5 mb-8">
              <div className="w-12 h-12 rounded-full bg-[rgba(249,115,22,0.15)] flex items-center justify-center shrink-0 text-xl">
                🛡️
              </div>
              <div>
                <p className="font-bold text-[#1e3a5f] text-lg mb-1">{l.guarantee.badgeTitle}</p>
                <p className="text-gray-700 text-sm leading-relaxed">{l.guarantee.badgeDesc}</p>
              </div>
            </div>
          </RevealOnScroll>

          {/* FAQ 2×2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-7">
            {[
              { q: l.guarantee.faq1Q, a: l.guarantee.faq1A, delay: 0 },
              { q: l.guarantee.faq2Q, a: l.guarantee.faq2A, delay: 80 },
              { q: l.guarantee.faq3Q, a: l.guarantee.faq3A, delay: 0 },
              { q: l.guarantee.faq4Q, a: l.guarantee.faq4A, delay: 80 },
            ].map((faq) => (
              <RevealOnScroll key={faq.q} delay={faq.delay}>
                <div>
                  <p className="font-bold text-[#1e3a5f] text-base mb-2">{faq.q}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* 10 · CTA final */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#1e3a5f] to-[#0f2240] text-white text-center">
        <RevealOnScroll>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{l.finalCta.title}</h2>
          <p className="text-blue-200 mb-8 text-base max-w-md mx-auto">{l.finalCta.subtitle}</p>
          <a href="/register">
            <button className="bg-[#f97316] hover:bg-[#ea6c0a] text-white font-bold px-10 py-4 rounded-xl text-lg transition-transform hover:scale-105 active:scale-95 anim-pulse-cta">
              {l.finalCta.cta}
            </button>
          </a>
        </RevealOnScroll>
      </section>

      {/* Footer */}
      <footer className="bg-[#1e3a5f] text-blue-200 py-10 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="text-xl font-extrabold text-white">Medaliq</span>
            <span className="text-sm text-blue-300">{l.footer.tagline}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="/terminos" className="hover:text-white transition-colors">{l.footer.terms}</a>
            <a href="/privacidad" className="hover:text-white transition-colors">{l.footer.privacy}</a>
            <a href="mailto:hola@medaliq.com" className="hover:text-white transition-colors">hola@medaliq.com</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
