import axios from 'axios';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Token e credenciais
const API_TOKEN = process.env.TIQUETAQUE_TOKEN || '78785513-1b2f-45f2-9913-10e36a24d1e5';
const API_BASE_URL = 'https://api.tiquetaque.com/v2.1';

// Removido cache para forçar 100% de tempo real

export interface AttendanceData {
  ativos: number;
  presentes: number;
  faltas: number;
  lista_faltas: Array<{ id: string; name: string }>;
  atrasados: number;
  hora_extra_count: number;
  hora_extra_horas: number; // Decimal hours
  saida_antecipada: number;
  intervalo_irregular: number; 
  sem_intervalo_mais_6h: number;
}

export class TiquetaqueService {
  private static get authHeader() {
    return 'Basic ' + Buffer.from(`public:${API_TOKEN}`).toString('base64');
  }

  static async getAttendanceToday(): Promise<AttendanceData> {

    try {
      console.log('⏳ Buscando funcionários do TiqueTaque...');
      // 2. Buscar funcionários ativos
      const employeesResponse = await axios.get(`${API_BASE_URL}/employees`, {
        headers: { Authorization: this.authHeader },
      });

      const employees = employeesResponse.data?._items || [];
      const totalAtivos = employees.length;

      // 3. Pegar a data de hoje formatada (timezone do Brasil)
      const nowBrazil = toZonedTime(new Date(), 'America/Sao_Paulo');
      const todayStr = format(nowBrazil, 'yyyy-MM-dd');

      let faltas = 0;
      let presentes = 0;
      let atrasados = 0;
      let hora_extra_count = 0;
      let hora_extra_horas = 0;
      let saida_antecipada = 0;
      let intervalo_irregular = 0;
      let sem_intervalo_mais_6h = 0;

      const listaFaltas: Array<{ id: string; name: string }> = [];

      // IMPORTANTE: Como as chamadas podem ser lentas e o TiqueTaque tem rate limits (60/min),
      // usaremos um loop interativo em lotes pequenos ou em série com delay 
      // para não bater  429 Too Many Requests
      const results: any[] = [];
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      console.log(`Buscando espelho de ponto diário para ${employees.length} funcionários...`);

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        
        // Evita estourar os limites da API (dorme 100ms a cada chamada)
        await delay(100);

        try {
          const tsRes = await axios.get(`${API_BASE_URL}/timesheets`, {
            headers: { Authorization: this.authHeader },
            params: {
              employee_id: emp._id,
              start_date: todayStr,
              end_date: todayStr,
            },
          });

          const timesheet = tsRes.data;
          // Verifica se houve pontos batidos hoje ou ocorrência de falta
          const daysData = timesheet?.days || {};
          const todayData = daysData[todayStr] || {};
          
          // Resumo Totais deste espelho diário
          const totalsData = timesheet?.totals || {};
          
          if (parseFloat(totalsData.atraso || '0') > 0) atrasados++;
          const extra = parseFloat(totalsData.extra || totalsData.horas_extras || '0');
          if (extra > 0) {
              hora_extra_count++;
              hora_extra_horas += extra;
          }
          if (parseFloat(totalsData.saida_antecipada || '0') > 0) saida_antecipada++;

          // Intervalo calc
          const horarios = todayData.horarios || [];
          if (horarios.length >= 4) {
             const h2 = new Date(horarios[1].horario).getTime();
             const h3 = new Date(horarios[2].horario).getTime();
             const diffMins = (h3 - h2) / 60000;
             if (diffMins < 60 && diffMins > 0) intervalo_irregular++;
          } else if (horarios.length === 2 && parseFloat(totalsData.trabalhada || totalsData.horas_trabalhadas || '0') > 6) {
             sem_intervalo_mais_6h++;
          }
          
          // Se registrou horário (tem array de horários)
          if (horarios.length > 0) {
              results.push({ status: 'presente', employee: emp });
          } 
          // Se tiver "falta_injustificada" ou "falta_justificada" é falta explícita
          else if (parseFloat(totalsData.falta_injustificada || '0') > 0 || parseFloat(totalsData.falta_justificada || '0') > 0) {
              results.push({ status: 'falta', employee: emp });
          } 
          else {
              results.push({ status: 'ausente', employee: emp });
          }
        } catch (error: any) {
          if (error.response?.status === 404) {
             results.push({ status: 'ausente', employee: emp });
          } else {
             console.error(`Erro ao buscar timesheet para ${emp.full_name}:`, error.message);
             results.push({ status: 'erro', employee: emp });
          }
        }
      }

      for (const res of results) {
        if (res.status === 'presente') {
          presentes++;
        } else if (res.status === 'falta' || res.status === 'ausente') {
          faltas++;
          listaFaltas.push({
            id: res.employee._id,
            name: res.employee.full_name,
          });
        }
      }

      const attendanceData: AttendanceData = {
        ativos: totalAtivos,
        presentes,
        faltas: listaFaltas.length, // ou `faltas`
        lista_faltas: listaFaltas,
        atrasados,
        hora_extra_count,
        hora_extra_horas,
        saida_antecipada,
        intervalo_irregular,
        sem_intervalo_mais_6h
      };

      return attendanceData;
    } catch (error) {
      console.error('❌ Erro de integração com TiqueTaque:', error);
      
      return { 
        ativos: 0, presentes: 0, faltas: 0, lista_faltas: [],
        atrasados: 0, hora_extra_count: 0, hora_extra_horas: 0, saida_antecipada: 0, intervalo_irregular: 0, sem_intervalo_mais_6h: 0 
      };
    }
  }

  // Novo método para puxar os pontos em tempo real pro Dashboard de Ponto Eletrônico
  static async getTimesheets(startDateStr: string, endDateStr: string): Promise<any[]> {
    try {
      console.log(`⏳ Buscando espelhos de ponto do TiqueTaque de ${startDateStr} a ${endDateStr}...`);
      const employeesResponse = await axios.get(`${API_BASE_URL}/employees`, {
        headers: { Authorization: this.authHeader },
      });
      const employees = employeesResponse.data?._items || [];

      const results: any[] = [];
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        await delay(100);

        try {
          const tsRes = await axios.get(`${API_BASE_URL}/timesheets`, {
            headers: { Authorization: this.authHeader },
            params: {
              employee_id: emp._id,
              start_date: startDateStr,
              end_date: endDateStr,
            },
          });

          const timesheet = tsRes.data;
          const daysData = timesheet?.days || {};

          // Iterar por todos os dias do timesheet recebido
          for (const [dateStr, dayData] of Object.entries<any>(daysData)) {
            const horarios = dayData.horarios || [];
            
            // Cada ponto em horarios tem "horario": "2026-03-21T08:00:00-03:00"
            const parseTime = (iso: string) => {
               if(!iso) return '';
               const d = new Date(iso);
               return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
            };

            let entrada1 = horarios[0] ? parseTime(horarios[0].horario) : '';
            let saida1 = horarios[1] ? parseTime(horarios[1].horario) : '';
            let entrada2 = horarios[2] ? parseTime(horarios[2].horario) : '';
            let saida2 = horarios[3] ? parseTime(horarios[3].horario) : '';

            // Se não houver horário mas é dia útil (e não tem justificativa), será falta
            // "falta_injustificada" etc vem no "totals" do dia se houver:
            const hoursWorked = parseFloat(dayData.horas_trabalhadas || '0');
            const hoursExtra = parseFloat(dayData.horas_extras || '0');

            let status = 'NORMAL';
            if (horarios.length === 0) {
               if (parseFloat(dayData.falta_injustificada || '0') > 0) status = 'FALTA';
               else if (parseFloat(dayData.falta_justificada || '0') > 0) status = 'JUSTIFICADO';
               else status = 'FOLGA'; // ou não precisava bater
            } else if (horarios.length % 2 !== 0) {
               status = 'INCOMPLETO';
            } else if (hoursExtra > 0) {
               status = 'HORA_EXTRA';
            }

            // Apenas adicionar se tiver horários batidos, ou se for Falta real
            // Se for apenas `FOLGA`, podemos pular para não poluir
            if (horarios.length > 0 || status === 'FALTA') {
              results.push({
                id: emp._id + '_' + dateStr,
                funcionarioNome: emp.full_name,
                data: dateStr,
                entrada1,
                saida1,
                entrada2,
                saida2,
                horasTrabalhadas: hoursWorked,
                horasExtras: hoursExtra,
                status
              });
            }
          }
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error(`Erro ao buscar timesheet de ${emp.full_name}:`, error.message);
          }
        }
      }

      return results;
    } catch(err) {
      console.error('Erro getTimesheets:', err);
      return [];
    }
  }
}
