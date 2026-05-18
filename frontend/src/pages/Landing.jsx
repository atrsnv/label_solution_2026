import { Button } from 'antd';
import {
  RiseOutlined,
  TeamOutlined,
  PieChartOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  DollarCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import { useAuthStore } from '../context/authStore';

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuthStore();

  const goApp = () => {
    if (user) {
      nav(user.role === 'ADMIN' ? '/admin/dashboard' : '/artist/dashboard');
    } else {
      nav('/login');
    }
  };

  return (
    <div className="landing">
      <PublicHeader />

      <section className="hero">
        <div>
          <h1>
            Прозрачные <span className="accent">сплиты</span><br />
            и быстрые выплаты артистам
          </h1>
          <p className="lead">
            ERP-платформа лейбла, где артист сам делит роялти с фитами,
            а лейбл за минуты разносит отчёты дистрибьютора по балансам.
            Никаких таблиц в Excel и переписок «а сколько кому».
          </p>
          <div className="cta">
            <Button type="primary" size="large" onClick={goApp}>
              {user ? 'Открыть кабинет' : 'Войти в систему'}
            </Button>
            <Button size="large" onClick={() => nav('/register')}>
              У меня есть инвайт
            </Button>
          </div>
        </div>

        {/* «Скрин» из макета — выписка по периоду */}
        <div className="preview-card">
          <div className="head">
            <div>
              <h3>Январь 2025</h3>
              <div className="sub">Origins Inconclusive · 1 янв – 31 янв</div>
            </div>
            <span className="pill">paid</span>
          </div>

          <div className="section-title">
            <span className="dot" /> Recoupable Costs
          </div>
          <div className="preview-row">
            <div className="desc">Option Renewal</div>
            <div className="date">Feb 19, 2026</div>
            <div className="amt amount-neg">−£3 010.31</div>
          </div>
          <div className="preview-row">
            <div className="desc">Advance</div>
            <div className="date">Feb 1, 2026</div>
            <div className="amt amount-neg">−£1 000.39</div>
          </div>
          <div className="preview-row">
            <div className="desc">Meta Ads (Spotify)</div>
            <div className="date">Dec 7, 2025</div>
            <div className="amt amount-neg">−£1 000.00</div>
          </div>
          <div className="preview-row" style={{ fontWeight: 700, borderTopColor: 'rgba(255,255,255,0.18)' }}>
            <div>Total Deductions</div>
            <div />
            <div className="amt amount-neg">−£5 010.70</div>
          </div>

          <div className="section-title" style={{ marginTop: 24 }}>
            <span className="dot" style={{ background: 'var(--green)' }} /> Credits
          </div>
          <div className="preview-row">
            <div className="desc">November Royalties</div>
            <div className="date">Dec 1, 2025</div>
            <div className="amt amount-pos">+£368.34</div>
          </div>
          <div className="preview-row">
            <div className="desc">October Royalties</div>
            <div className="date">Nov 1, 2025</div>
            <div className="amt amount-pos">+£433.04</div>
          </div>
          <div className="preview-row" style={{ fontWeight: 700, borderTopColor: 'rgba(255,255,255,0.18)' }}>
            <div>Total Credits</div>
            <div />
            <div className="amt amount-pos">+£801.38</div>
          </div>
        </div>
      </section>

      <section className="features" id="artists">
          <Feature
            icon={<RiseOutlined />}
            title="Аналитика DataLens"
            text="Общий аналитический контур DataLens и красивые ERP-витрины: сводки лейбла, личные графики артистов, начисления и динамика дохода."
          />
        <Feature
          icon={<TeamOutlined />}
          title="Сплиты с фитами"
          text="Артист добавляет соавторов по email и распределяет проценты. Пока все не подтвердили — трек не идёт в расчёт."
        />
        <Feature
          icon={<DollarCircleOutlined />}
          title="Импорт отчёта"
          text="Drag-and-drop CSV или XLSX от дистрибьютора → сумма автоматически разносится по сплитам и балансам."
        />
        <Feature
          icon={<PieChartOutlined />}
          title="Реестр треков"
          text="Видно статус каждого релиза: на согласовании, утверждён, ошибка. С фильтрами и поиском."
        />
        <Feature
          icon={<SafetyCertificateOutlined />}
          title="Роли и доступы"
          text="Админ управляет долей лейбла и инвайтит артистов. Артист видит только свои данные."
        />
        <Feature
          icon={<ThunderboltOutlined />}
          title="Готово за хакатон"
          text="Vite + React + Ant Design + Prisma. Запуск одной командой, миграции и сид — из коробки."
        />
      </section>

      <footer className="landing-footer">
        © {new Date().getFullYear()} Label ERP · Hackathon edition
      </footer>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature">
      <div className="icon">{icon}</div>
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}
