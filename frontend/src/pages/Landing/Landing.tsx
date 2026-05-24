import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="max-w-[1440px] mx-auto p-8 flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-white text-5xl md:text-7xl font-extrabold mb-6">
        Твой идеальный инвентарь <br /> начинается здесь
      </h1>
      <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10">
        Единая платформа для аналитики цен CS2, создания сетов по цветам и расчета прибыльности контрактов.
      </p>
      <Link to="/market" className="bg-[#FF9408] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-orange-600 transition">
        Перейти в каталог
      </Link>
    </div>
  );
};

export default Landing;