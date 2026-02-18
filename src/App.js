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

const generateFixedSimulatedResults = (initialBalanceCents) => {
  const base = Number(initialBalanceCents);
  const results = [];

  const start = new Date("2026-01-03");
  const end = new Date("2026-02-09");

  const MIN_PROFIT = 4.86;
  const MAX_PROFIT = 36.45;

  // 🔥 seed baseada no saldo (sempre igual para mesma conta)
  const seed = Math.floor(base);
  const random = mulberry32(seed);

  let current = new Date(start);
  let lastProfit = null;

  while (current < end) {
    const day = current.getDay();

    if (day !== 0 && day !== 6) {
      let profit;

      // 🔥 força variação real e evita valores próximos
      do {
        const r = random();
        profit = MIN_PROFIT + r * (MAX_PROFIT - MIN_PROFIT);
      } while (
        lastProfit !== null &&
        Math.abs(profit - lastProfit) < 3
      );

      lastProfit = profit;

      results.push({
        date: current.getTime() / 1000,
        profit: Math.round(profit * 100),
      });
    }

    current.setDate(current.getDate() + 1);
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

// 🔥 Gera tabela fixa
const fixedSimulated = generateFixedSimulatedResults(
  Number(metrics.total_deposits)
);

// 🔥 Pega a primeira data real
let combinedDailyResults = [];

if (realDailyResults.length > 0) {
  const firstRealDate = realDailyResults[0].date;

  const filteredSimulated = fixedSimulated.filter(
    sim => sim.date < firstRealDate
  );

  combinedDailyResults = [
    ...filteredSimulated,
    ...realDailyResults,
  ];
} else {
  combinedDailyResults = fixedSimulated;
}
        
        // 🔥 RECALCULA LUCROS BASEADOS NA SIMULAÇÃO

        let totalProfitCents = 0;
        let dailyProfitCents = 0;
        let weeklyProfitCents = 0;
        let monthlyProfitCents = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        combinedDailyResults.forEach((day) => {
          totalProfitCents += Number(day.profit);

          const dateObj = new Date(day.date * 1000);

          // 🔥 LUCRO DO DIA MAIS RECENTE REGISTRADO
          const latestDate = combinedDailyResults[combinedDailyResults.length - 1];
          if (day.date === latestDate?.date) {
            dailyProfitCents += Number(day.profit);
          }

          // 🔥 SEMANA ATUAL (segunda até hoje)
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0,0,0,0);

          if (dateObj >= weekStart) {
            weeklyProfitCents += Number(day.profit);
          }

          // 🔥 MÊS CALENDÁRIO ATUAL
          if (
            dateObj.getMonth() === currentMonth &&
            dateObj.getFullYear() === currentYear
          ) {
            monthlyProfitCents += Number(day.profit);
          }
        });

        const startingEquity = safeMoney(metrics.total_deposits);
        let equity = startingEquity;

        // EQUITY CURVE
        const equityCurve = combinedDailyResults.map((day) => {
          equity += safeMoney(day.profit);
          return {
            date: new Date(day.date * 1000).toLocaleDateString(),
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
          date: new Date(day.date * 1000).toLocaleDateString(),
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
            title="Lucro Semanal"
            value={`$ ${safeMoney(metrics.weekly_profit).toFixed(
              2
            )} (${weeklyProfitPercent.toFixed(2)}%)`}
            positive={safeMoney(metrics.weekly_profit) >= 0}
          />

          <MetricCard
            title="Lucro Mensal"
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
