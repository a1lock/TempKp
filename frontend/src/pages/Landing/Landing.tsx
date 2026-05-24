import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="max-w-[1440px] mx-auto p-8 flex flex-col min-h-[85vh] justify-between">
      {/* главный баннер */}
      <section className="flex flex-col items-start justify-center flex-1 max-w-3xl py-12">
        <h1 className="text-white text-5xl md:text-6xl font-extrabold mb-2 tracking-tight">
          Твой идеальный инвентарь
        </h1>
        <h2 className="text-white text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
          начинается здесь
        </h2>
        <p className="text-gray-400 text-lg md:text-xl mb-8 leading-relaxed">
          Единая платформа для аналитики цен CS2, создания сетов по цветам и расчета прибыльности контрактов.
        </p>
        <Link to="/market" className="bg-[#FF9408] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-orange-600 transition">
          Перейти в каталог
        </Link>
      </section>

      {/* преимущества */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12 border-t border-gray-800">
        <div className="bg-[#1A1B23] p-6 rounded-xl border border-gray-800">
          <h3 className="text-white font-bold text-lg mb-3">Умный поиск</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Фильтруйте внутриигровые предметы по цветам, качеству и стоимости для поиска лучших эстетических решений.
          </p>
        </div>
        <div className="bg-[#1A1B23] p-6 rounded-xl border border-gray-800">
          <h3 className="text-white font-bold text-lg mb-3">Сеты под бюджет</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Проектируйте полные комплекты предметов под жестко заданные финансовые лимиты с оценкой совместимости.
          </p>
        </div>
        <div className="bg-[#1A1B23] p-6 rounded-xl border border-gray-800">
          <h3 className="text-white font-bold text-lg mb-3">Точный крафт</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Прогнозируйте точный износ и рентабельность обмена до совершения сделки на торговых площадках.
          </p>
        </div>
      </section>

      {/* призыв к действию */}
      <section className="bg-[#1A1B23] p-10 rounded-xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 my-12">
        <div>
          <h3 className="text-white text-2xl font-bold mb-2">Готов обновить свой инвентарь?</h3>
          <p className="text-gray-400 text-sm">Начните собирать свой первый комплект прямо сейчас.</p>
        </div>
        <Link to="/market" className="bg-[#FF9408] text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition shrink-0">
          Перейти в каталог
        </Link>
      </section>

      {/* унифицированный подвал */}
      <footer className="flex justify-between items-center py-6 border-t border-gray-800 text-gray-500 text-xs">
        <span>SteamS&C</span>
        <span>disclaimer - API source - © 2026</span>
      </footer>
    </div>
  );
};

export default Landing;