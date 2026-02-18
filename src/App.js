import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function App() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const safeMoney = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 0;
  return Number(value) / 100; // 🔥 divide por 100 automaticamente
  };

  const safeNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Number(value);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get("https://server-ultra-bot.onrender.com/accounts");
      //const res = await axios.get("http://127.0.0.1:3000/accounts");
      const accountsData = res.data.map((acc) => {
        const metrics = acc.metrics || {};

        // 🔹 Gerar equityCurve a partir de daily_results
        const startingEquity = safeMoney(metrics.total_deposits);
        let equity = startingEquity;

        const equityCurve = (metrics.daily_results || []).map((day) => {
          equity += safeMoney(day.profit);
          return {
            date: new Date(day.date * 1000).toLocaleDateString(),
            equity: equity, // valor absoluto
          };
        });

        // Adiciona ponto inicial se necessário
        if (equityCurve.length === 0 || equityCurve[0].equity !== startingEquity) {
          equityCurve.unshift({
            date: new Date().toLocaleDateString(),
            equity: startingEquity,
          });
        }

        return { ...acc, metrics, equityCurve, startingEquity };
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
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Carregando Dashboard...</h1>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}> Asset Dashboard</h1>

      {accounts.length === 0 && (
        <p style={{ color: "#aaa" }}>Nenhuma conta conectada.</p>
      )}

      <div style={styles.accountsGrid}>
        {accounts.map((acc) => {
        const metrics = acc.metrics || {};
        const equityCurve = acc.equityCurve || [];
        const startingEquity = acc.startingEquity || 0;

        // 🔹 Calcula % do lucro baseado nos depósitos totais
        const totalDeposits = safeMoney(metrics.total_deposits);
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

        return (
          <div key={acc.ea_code} style={styles.accountCard}>
            <h2 style={styles.accountTitle}>
              {acc.ea_code || "Conta Desconhecida"}
            </h2>

            {/* 🔹 LINHA 1: Login, Depósitos, Saques */}
            <div style={styles.grid}>
              <MetricCard title="Login" value={metrics.login || "-"} />
              <MetricCard
                title="Depósitos Totais"
                value={`$ ${totalDeposits.toFixed(2)}`}
                positive
              />
              <MetricCard
                title="Saques Totais"
                value={`$ ${safeMoney(metrics.total_withdraws).toFixed(2)}`}
              />
            
      
              <MetricCard
                title="Lucro Total"
                value={`$ ${safeMoney(metrics.total_profit).toFixed(
                  2
                )} (${totalProfitPercent.toFixed(2)}%)`}
                positive={safeMoney(metrics.total_profit) >= 0}
              />
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
            </div>

            {/* 🔹 Saldo Atual */}
            <div style={styles.grid}>
              <MetricCard
                title="Saldo Atual"
                value={`$ ${(
                  safeMoney(metrics.balance) ||
                  (safeMoney(metrics.initial_deposit) +
                    safeMoney(metrics.total_profit))
                ).toFixed(2)}`}
                positive
              />
              <MetricCard
                title="Max DD Flutuante"
                value={`$ ${Math.abs(safeMoney(metrics.floating_dd_max)).toFixed(2)}`}
                danger
              />
            

              <MetricCard
                title="Ordens Buy"
                value={`${safeNumber(metrics.openBuyOrders || 0)} ords / ${safeNumber(
                  metrics.totalLotBuy || 0
                )} lot`}
              />
              <MetricCard
                title="Ordens Sell"
                value={`${safeNumber(metrics.openSellOrders || 0)} ords / ${safeNumber(
                  metrics.totalLotSell || 0
                )} lot`}
              />
            </div>

            {/* 🔹 EQUITY GRAPH */}
            {equityCurve.length > 0 && (
              <div style={{ ...styles.chartContainer, height: 300 }}>
                <h3 style={{ marginBottom: 20 }}>Evolução do Capital</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      stroke="#ccc"
                      type="category"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#ccc"
                      tick={{ fontSize: 12 }}
                      domain={[startingEquity, 'auto']} // mínimo = total de depósitos
                    />
                    <Tooltip
                      formatter={(value) => `$ ${Number(value).toFixed(2)}`}
                      labelFormatter={(label) => `Data: ${label}`}
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
          </div>
        );
      })}
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
    marginBottom: 40,
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
    maxWidth: "1400px",   // 👈 controla largura máxima
      
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
    width: "100%",
    display: "block",
  },
  
  accountsGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1000px))",
justifyContent: "center",
  gap: 30,
  },
};

export default App;
