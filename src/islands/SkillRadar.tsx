import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface SkillData {
  axis: string;
  value: number;
}

interface Props {
  data: SkillData[];
}

export default function SkillRadar({ data }: Props) {
  return (
    <div className="w-full max-w-md mx-auto">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <Radar
            dataKey="value"
            stroke="#4c6ef5"
            fill="#4c6ef5"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
