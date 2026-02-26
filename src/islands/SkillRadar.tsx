import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { useState, useEffect } from 'react';

interface SkillData {
  axis: string;
  value: number;
}

interface Props {
  data: SkillData[];
}

export default function SkillRadar({ data }: Props) {
  const [size, setSize] = useState(320);

  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth - 32, 420);
      setSize(Math.max(280, w));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div className="flex justify-center">
      <RadarChart
        width={size}
        height={size}
        data={data}
        cx="50%"
        cy="50%"
        outerRadius="70%"
      >
        <PolarGrid stroke="#4b5563" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 500 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#6b7280', fontSize: 10 }}
          axisLine={false}
        />
        <Radar
          dataKey="value"
          stroke="#748ffc"
          fill="#4c6ef5"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </div>
  );
}
