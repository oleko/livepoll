import Link from "next/link";

export const metadata = { title: "Быстрый старт" };

export default function GettingStartedPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/help" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors md:hidden inline-block mb-6">
        ← Помощь
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Быстрый старт</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        Первое мероприятие с живыми голосованиями — за пять минут.
      </p>

      <div className="space-y-10">

        <Step n="1" title="Создайте аккаунт">
          <p>
            Перейдите на главную страницу и нажмите <b>«Начать бесплатно»</b>. Введите имя, email и
            пароль — готово. Никакой проверки почты ждать не нужно: вы сразу попадёте в личный кабинет.
          </p>
          <Tip>
            Организация создаётся автоматически при регистрации. Название можно поменять позже в Настройках.
          </Tip>
        </Step>

        <Step n="2" title="Создайте мероприятие">
          <p>
            На главной странице личного кабинета нажмите <b>«Новое мероприятие»</b>. Введите название —
            например, «DevConf 2025» или «Ретро спринта». Больше ничего заполнять не нужно.
          </p>
          <p className="mt-2">
            Мероприятие создаётся в статусе <Badge color="slate">Черновик</Badge> — можно спокойно
            подготовиться, участники ещё не могут зайти.
          </p>
        </Step>

        <Step n="3" title="Добавьте опросы">
          <p>
            Внутри мероприятия найдите форму <b>«Добавить опрос»</b> справа. Выберите тип,
            введите вопрос и (если нужно) варианты ответов. Нажмите <b>«Создать»</b>.
          </p>
          <p className="mt-2">
            Добавьте столько опросов, сколько нужно — все они будут в очереди и запускаются
            по одному в любом порядке.
          </p>
          <Tip>
            Не знаете, с какого типа начать? Попробуйте <b>Множественный выбор</b> — самый
            универсальный формат.
          </Tip>
        </Step>

        <Step n="4" title="Откройте дисплейный экран">
          <p>
            Нажмите кнопку <b>«Экран»</b> — откроется отдельная вкладка, которую нужно вывести
            на проектор или поставить на второй монитор. На экране сразу виден крупный QR-код
            и код для ручного ввода — участники смогут подключиться ещё до старта.
          </p>
        </Step>

        <Step n="5" title="Запустите мероприятие">
          <p>
            В панели управления нажмите <b>«Начать мероприятие»</b>. Статус сменится на{" "}
            <Badge color="green">Идёт</Badge>. Участники теперь могут войти по QR-коду или ссылке.
          </p>
          <p className="mt-2">
            Чтобы поделиться ссылкой через Telegram, VK или почту — нажмите на иконку нужного
            мессенджера рядом с кодом участника.
          </p>
        </Step>

        <Step n="6" title="Управляйте опросами в реальном времени">
          <p>
            Нажмите <b>«Запустить»</b> рядом с нужным опросом. На дисплейном экране появится вопрос,
            участники увидят интерфейс голосования, а результаты обновляются мгновенно по мере
            поступления голосов.
          </p>
          <p className="mt-2">
            Закройте опрос вручную кнопкой <b>«Закрыть»</b> или дождитесь срабатывания таймера
            (если вы его задали). После закрытия можно запустить следующий.
          </p>
        </Step>

        <Step n="7" title="Используйте инструменты ведущего">
          <p>
            Пока идёт мероприятие, в правой панели доступны дополнительные инструменты:
          </p>
          <ul className="mt-2 space-y-2">
            <li className="flex gap-2"><span className="text-indigo-400 shrink-0">📢</span><span><b>Объявление</b> — введите текст и время, нажмите «Объявить». Сообщение мгновенно появится поверх всего на экране проектора и у каждого участника.</span></li>
            <li className="flex gap-2"><span className="text-indigo-400 shrink-0">🔥</span><span><b>Пульс зала</b> — у участников на телефоне есть кнопка 🔥. В шапке дисплейного экрана виден счётчик активности в реальном времени.</span></li>
            <li className="flex gap-2"><span className="text-indigo-400 shrink-0">👥</span><span><b>Счётчик присутствующих</b> — введите число людей в зале, и участники увидят на экране ожидания, сколько человек уже подключилось.</span></li>
          </ul>
        </Step>

        <Step n="8" title="Завершите мероприятие">
          <p>
            Когда всё готово, нажмите <b>«Завершить»</b>. Мероприятие переходит в статус{" "}
            <Badge color="slate">Завершено</Badge>, и все результаты сохраняются. Участники
            получат тёплое прощальное сообщение, сгенерированное AI. Вы сможете
            посмотреть итоги в любой момент — они хранятся в вашем аккаунте.
          </p>
        </Step>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex gap-6 text-sm">
        <Link href="/help/poll-types" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Типы опросов →
        </Link>
        <Link href="/help/display-screen" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Дисплейный экран →
        </Link>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div className="flex-1">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{title}</h2>
        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-300">
      💡 {children}
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "slate" }) {
  const cls = color === "green"
    ? "bg-green-100 dark:bg-green-400/10 text-green-700 dark:text-green-400"
    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}
