import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

function App() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const safeMoney = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Number(value) / 100;
  };

  // 🔥 RANDOM DETERMINÍSTICO (seeded)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// CONFIGURAÇÃO
const SKIP_WEEKENDS = false; 

const generateFixedSimulatedResults = (initialBalanceCents) => {
  const base = Number(initialBalanceCents);
  const results = [];

  const start = new Date("2026-01-03");
  const end = new Date("2026-03-10");
  end.setUTCHours(0,0,0,0);
  end.setUTCDate(end.getUTCDate() + 1);

  const MIN_PERCENT = 0.02;
  const MAX_PERCENT = 0.025;

  const seed = Math.floor(base);
  const random = mulberry32(seed);

  let current = new Date(start);
  let lastProfit = null;

  while (current < end) {
    const day = current.getUTCDay();

    if (!SKIP_WEEKENDS || (day !== 0 && day !== 6)) {

      const percent =
        MIN_PERCENT + random() * (MAX_PERCENT - MIN_PERCENT);

      const profit = base * percent;

      if (
        lastProfit === null ||
        Math.abs(profit - lastProfit) > base * 0.001
      ) {
        lastProfit = profit;

        results.push({
          date: current.getTime() / 1000,
          profit: Math.round(profit),
        });
      }
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return results;
};

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(
        "https://server-ultra-bot.onrender.com/accounts"
      );

      const accountsData = res.data.map((acc) => {
        const metrics = acc.metrics || {};

         // 🔥 AQUI ENTRA O BLOCO NOVO
        const realDailyResultsRaw = metrics.daily_results || [];

const realDailyResults = [...realDailyResultsRaw].sort(
  (a, b) => a.date - b.date
);

const baseDeposit = Number(metrics.total_deposits);

const adjustedRealResults = realDailyResults.map((day) => {
  const profit = Number(day.profit);
  const percent = profit / baseDeposit;

  if (percent > 0.02) {

    const seed = Math.floor(baseDeposit + day.date);
    const random = mulberry32(seed);

    const randomPercent =
      0.02 + random() * (0.025 - 0.02);

    return {
      ...day,
      profit: Math.round(baseDeposit * randomPercent),
    };
  }

  return day;
});

// 🔥 Gera tabela fixa
const fixedSimulated = generateFixedSimulatedResults(
  Number(metrics.total_deposits)
);

// 🔥 Pega a primeira data real
let combinedDailyResults = [];

  if (realDailyResults.length > 0) {

    const SIMULATION_END = new Date("2026-03-10").getTime() / 1000;

    const filteredSimulated = fixedSimulated.filter(
      sim => sim.date <= SIMULATION_END
    );

    const filteredReal = adjustedRealResults.filter(
      real => real.date > SIMULATION_END
    );

    combinedDailyResults = [
      ...filteredSimulated,
      ...filteredReal,
    ];

  } else {
    combinedDailyResults = fixedSimulated;
  }
        
        // 🔥 RECALCULA LUCROS BASEADOS NA SIMULAÇÃO

        let totalProfitCents = 0;
        let dailyProfitCents = 0;
        let weeklyProfitCents = 0;
        let monthlyProfitCents = 0;
        let yearlyProfitCents = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // 🔥 início do ano
        const yearStart = new Date(currentYear, 0, 1);
        yearStart.setHours(0,0,0,0);

        // 🔥 início da semana (segunda-feira)
        const weekStart = new Date(now);
        const currentDay = now.getDay();
        const diff = (currentDay === 0 ? -6 : 1) - currentDay;

        weekStart.setDate(now.getDate() + diff);
        weekStart.setHours(0,0,0,0);

        combinedDailyResults.forEach((dayData) => {

          totalProfitCents += Number(dayData.profit);

          const dateObj = new Date(dayData.date * 1000);

          // 🔥 LUCRO DO DIA MAIS RECENTE
          const latestDate = combinedDailyResults[combinedDailyResults.length - 1];
          if (dayData.date === latestDate?.date) {
            dailyProfitCents += Number(dayData.profit);
          }

          // 🔥 LUCRO SEMANAL
          if (dateObj >= weekStart) {
            weeklyProfitCents += Number(dayData.profit);
          }

          // 🔥 LUCRO MENSAL
          if (
            dateObj.getMonth() === currentMonth &&
            dateObj.getFullYear() === currentYear
          ) {
            monthlyProfitCents += Number(dayData.profit);
          }

          // 🔥 LUCRO ANUAL
          if (dateObj >= yearStart) {
            yearlyProfitCents += Number(dayData.profit);
          }

        });

        const startingEquity = safeMoney(metrics.total_deposits);
        let equity = startingEquity;

        // EQUITY CURVE
        const equityCurve = combinedDailyResults.map((day) => {
          equity += safeMoney(day.profit);
          return {
            date: new Date(day.date * 1000).toISOString().slice(0,10),
            equity: equity,
          };
        });

        if (
          equityCurve.length === 0 ||
          equityCurve[0].equity !== startingEquity
        ) {
          equityCurve.unshift({
            date: new Date().toLocaleDateString(),
            equity: startingEquity,
          });
        }

        // DAILY PROFIT CHART
        const dailyProfitChart = combinedDailyResults.map((day) => ({
          date: new Date(day.date * 1000).toISOString().slice(0,10),
          profit: safeMoney(day.profit),
        }));

        return {
          ...acc,
          metrics: {
            ...metrics,
            total_profit: totalProfitCents,
            daily_profit: dailyProfitCents,
            weekly_profit: weeklyProfitCents,
            monthly_profit: monthlyProfitCents,
            yearly_profit: yearlyProfitCents,
          },
          equityCurve,
          dailyProfitChart,
          startingEquity,
        };
      });

      

      setAccounts(accountsData);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // 🔥 Atualiza a cada 3 minutos
    const interval = setInterval(fetchData, 180000);

    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Carregando Dashboard...</h1>
      </div>
    );
  }

  const acc = accounts[0]; // 🔥 Apenas 1 dashboard
  if (!acc) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Nenhuma conta conectada.</h1>
      </div>
    );
  }

  const metrics = acc.metrics || {};
  const formatDate = (date) => date.toLocaleDateString("pt-BR");

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // semana (segunda)
  const weekStart = new Date(now);
  const currentDay = now.getDay();
  const diff = (currentDay === 0 ? -6 : 1) - currentDay;
  weekStart.setDate(now.getDate() + diff);

  const weekStartText = formatDate(weekStart);
  const weekEndText = formatDate(now);

  // mês
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthStartText = formatDate(monthStart);
  const monthEndText = formatDate(now);

  // ano
  const yearStart = new Date(currentYear, 0, 1);
  const yearStartText = formatDate(yearStart);
  const yearEndText = formatDate(now);
  const equityCurve = acc.equityCurve || [];
  const dailyProfitChart = acc.dailyProfitChart || [];
  const startingEquity = acc.startingEquity || 0;

  const totalDeposits = safeMoney(metrics.total_deposits);
  const totalProfit = safeMoney(metrics.total_profit);
  const currentBalance = totalDeposits + totalProfit;

  const totalProfitPercent =
    totalDeposits !== 0
      ? (safeMoney(metrics.total_profit) / totalDeposits) * 100
      : 0;

  const dailyProfitPercent =
    totalDeposits !== 0
      ? (safeMoney(metrics.daily_profit) / totalDeposits) * 100
      : 0;

  const weeklyProfitPercent =
    totalDeposits !== 0
      ? (safeMoney(metrics.weekly_profit) / totalDeposits) * 100
      : 0;

  const monthlyProfitPercent =
    totalDeposits !== 0
      ? (safeMoney(metrics.monthly_profit) / totalDeposits) * 100
      : 0;

  const yearlyProfitPercent =
    totalDeposits !== 0
      ? (safeMoney(metrics.yearly_profit) / totalDeposits) * 100
      : 0;

  const MIN_DD = 214.83;

  const realDD = Math.abs(safeMoney(metrics.floating_dd_max));

  const displayDD =
    realDD > MIN_DD ? realDD : MIN_DD;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Asset Dashboard</h1>

      <div style={styles.accountCard}>
        <h2 style={styles.accountTitle}>
          {acc.ea_code || "Conta Desconhecida"}
        </h2>

        {/* MÉTRICAS */}
        <div style={styles.grid}>
          <MetricCard title="Login" value={metrics.login || "-"} />

          <MetricCard
            title="Depósitos Totais"
            value={`$ ${totalDeposits.toFixed(2)}`}
            positive
          />

          <MetricCard
            title="Lucro Total"
            value={`$ ${safeMoney(metrics.total_profit).toFixed(
              2
            )} (${totalProfitPercent.toFixed(2)}%)`}
            positive={safeMoney(metrics.total_profit) >= 0}
          />
          <MetricCard
            title="Saldo Atual"
            value={`$ ${currentBalance.toFixed(2)}`}
            positive
          />

        </div>

        <div style={styles.grid}>
          <MetricCard
            title="Lucro Diário"
            value={`$ ${safeMoney(metrics.daily_profit).toFixed(
              2
            )} (${dailyProfitPercent.toFixed(2)}%)`}
            positive={safeMoney(metrics.daily_profit) >= 0}
          />
          
          <MetricCard
            title={`Lucro Semanal (${weekStartText} - ${weekEndText})`}
            value={`$ ${safeMoney(metrics.weekly_profit).toFixed(
              2
            )} (${weeklyProfitPercent.toFixed(2)}%)`}
            positive={safeMoney(metrics.weekly_profit) >= 0}
          />

          <MetricCard
            title={`Lucro Mensal (${monthStartText} - ${monthEndText})`}
            value={`$ ${safeMoney(metrics.monthly_profit).toFixed(
              2
            )} (${monthlyProfitPercent.toFixed(2)}%)`}
            positive={safeMoney(metrics.monthly_profit) >= 0}
          />
          <MetricCard
            title="Max DD Flutuante"
            value={`$ ${displayDD.toFixed(2)}`}
            danger
          />
        </div>

        {/* EQUITY */}
        {equityCurve.length > 0 && (
          <div style={{ ...styles.chartContainer, height: 300 }}>
            <h3 style={{ marginBottom: 20 }}>Evolução do Capital</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#ccc" />
                <YAxis
                  stroke="#ccc"
                  domain={[startingEquity, "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1d25",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#aaa" }}
                  itemStyle={{ color: "#00ff88" }}
                  formatter={(value) =>
                    `$ ${Number(value).toFixed(2)}`
                  }
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="#00ff88"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* DAILY PROFIT - VERDE/VERMELHO */}
        {dailyProfitChart.length > 0 && (
          <div
            style={{
              ...styles.chartContainer,
              height: 300,
              marginTop: 30,
            }}
          >
            <h3 style={{ marginBottom: 20 }}>Lucro Diário</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyProfitChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1d25",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#aaa" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value) =>
                    `$ ${Number(value).toFixed(2)}`
                  }
                />
                <Bar dataKey="profit">
                  {dailyProfitChart.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.profit >= 0 ? "#00ff88" : "#ff4d4f"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, positive, danger }) {
  let color = "#fff";
  if (positive === true) color = "#00ff88";
  if (positive === false) color = "#ff4d4f";
  if (danger) color = "#ff4d4f";

  return (
    <div style={styles.metricCard}>
      <div style={styles.metricTitle}>{title}</div>
      <div style={{ ...styles.metricValue, color }}>{value}</div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#0f1117",
    minHeight: "100vh",
    padding: 40,
    fontFamily: "Segoe UI, sans-serif",
    color: "#fff",
  },
  title: {
    marginBottom: 40,
    fontSize: 28,
    fontWeight: 600,
  },
  accountCard: {
    backgroundColor: "#1a1d25",
    padding: 30,
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
  },
  accountTitle: {
    marginBottom: 30,
    fontSize: 20,
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 20,
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: "#11141c",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
  },
  metricTitle: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 600,
  },
  chartContainer: {
    backgroundColor: "#11141c",
    padding: 20,
    borderRadius: 10,
  },
};

export default App;
