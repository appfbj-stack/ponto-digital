import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculatePeriod, type WeeklySchedule } from '@kairos/timesheet';

/**
 * Serviço de exportação de relatórios.
 * Gera PDF e Excel sob demanda.
 *
 * Stream-based: não materializa o arquivo em disco.
 * Retorna Buffer pronto pra enviar.
 */
@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gera PDF do espelho de ponto de um funcionário.
   */
  async generateTimesheetPDF(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { schedule: true, department: true, tenant: true },
    });
    if (!employee) throw new Error('Funcionário não encontrado');

    const punches = await this.prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: { gte: startDate, lte: endDate },
        status: { in: ['VALIDATED', 'SYNCED', 'CORRECTED'] },
      },
      orderBy: { timestamp: 'asc' },
    });

    const weeklySchedule: WeeklySchedule =
      (employee.schedule?.weeklyHours as WeeklySchedule) || {};
    const period = calculatePeriod(
      startDate,
      endDate,
      weeklySchedule,
      punches.map((p) => ({ type: p.type as any, timestamp: p.timestamp.toISOString() })),
      {
        entryToleranceMinutes: employee.schedule?.entryToleranceMinutes ?? 10,
        exitToleranceMinutes: employee.schedule?.exitToleranceMinutes ?? 10,
      },
    );

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Cabeçalho
        doc.fontSize(18).text('Espelho de Ponto', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#666').text(employee.tenant.name, { align: 'center' });
        doc.moveDown(1);
        doc.fillColor('#000');

        // Info do funcionário
        doc.fontSize(11);
        doc.text(`Funcionário: ${employee.name}`);
        doc.text(`CPF: ${employee.cpf}`);
        if (employee.registration) doc.text(`Matrícula: ${employee.registration}`);
        if (employee.department) doc.text(`Departamento: ${employee.department.name}`);
        if (employee.schedule) doc.text(`Jornada: ${employee.schedule.name}`);
        doc.text(
          `Período: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`,
        );
        doc.moveDown(1);

        // Tabela
        const tableTop = doc.y;
        const colWidths = [70, 50, 60, 50, 60, 50, 60];
        const colX = [40, 110, 160, 220, 270, 330, 380];
        const rowHeight = 18;

        // Header
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Data', colX[0], tableTop, { width: colWidths[0] });
        doc.text('Previsto', colX[1], tableTop, { width: colWidths[1] });
        doc.text('Trabalhado', colX[2], tableTop, { width: colWidths[2] });
        doc.text('Atraso', colX[3], tableTop, { width: colWidths[3] });
        doc.text('H. Extra', colX[4], tableTop, { width: colWidths[4] });
        doc.text('Saldo', colX[5], tableTop, { width: colWidths[5] });
        doc.text('Status', colX[6], tableTop, { width: colWidths[6] });

        // Linha do header
        doc
          .moveTo(40, tableTop + 12)
          .lineTo(555, tableTop + 12)
          .stroke();

        // Rows
        doc.font('Helvetica').fontSize(8);
        let y = tableTop + 16;

        for (const day of period.days.filter((d) => d.status !== 'REST_DAY')) {
          if (y > 750) {
            doc.addPage();
            y = 40;
          }

          doc.text(format(new Date(day.date + 'T12:00:00'), 'dd/MM/yyyy'), colX[0], y, {
            width: colWidths[0],
          });
          doc.text(this.formatMin(day.expectedMinutes), colX[1], y, { width: colWidths[1] });
          doc.text(this.formatMin(day.workedMinutes), colX[2], y, { width: colWidths[2] });
          doc.text(day.lateMinutes > 0 ? `${day.lateMinutes}min` : '-', colX[3], y, {
            width: colWidths[3],
          });
          doc.text(day.overtimeMinutes > 0 ? `${day.overtimeMinutes}min` : '-', colX[4], y, {
            width: colWidths[4],
          });
          doc.text(this.formatMinSigned(day.balanceMinutes), colX[5], y, { width: colWidths[5] });
          doc.text(day.status, colX[6], y, { width: colWidths[6] });

          y += rowHeight;
        }

        // Linha do total
        doc.moveTo(40, y).lineTo(555, y).stroke();
        y += 4;
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('TOTAL', colX[0], y, { width: colWidths[0] });
        doc.text(this.formatMin(period.totals.expectedMinutes), colX[1], y, {
          width: colWidths[1],
        });
        doc.text(this.formatMin(period.totals.workedMinutes), colX[2], y, {
          width: colWidths[2],
        });
        doc.text(`${period.totals.debitMinutes}min`, colX[3], y, { width: colWidths[3] });
        doc.text(`${period.totals.overtimeMinutes}min`, colX[4], y, { width: colWidths[4] });
        doc.text(this.formatMinSigned(period.totals.balanceMinutes), colX[5], y, {
          width: colWidths[5],
        });
        doc.text(
          `${period.totals.daysWorked}/${period.totals.daysWorked + period.totals.daysAbsent}`,
          colX[6],
          y,
          { width: colWidths[6] },
        );

        // Saldo acumulado
        y += 30;
        doc.fontSize(12);
        doc.text(
          `Saldo Acumulado: ${this.formatMinSigned(period.totals.balanceMinutes)}`,
          40,
          y,
        );

        // Rodapé
        doc.fontSize(8).fillColor('#999');
        doc.text(
          `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
          40,
          800,
          { align: 'center' },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Gera Excel do espelho de ponto.
   */
  async generateTimesheetExcel(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { schedule: true, department: true, tenant: true },
    });
    if (!employee) throw new Error('Funcionário não encontrado');

    const punches = await this.prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: { gte: startDate, lte: endDate },
        status: { in: ['VALIDATED', 'SYNCED', 'CORRECTED'] },
      },
      orderBy: { timestamp: 'asc' },
    });

    const weeklySchedule: WeeklySchedule =
      (employee.schedule?.weeklyHours as WeeklySchedule) || {};
    const period = calculatePeriod(
      startDate,
      endDate,
      weeklySchedule,
      punches.map((p) => ({ type: p.type as any, timestamp: p.timestamp.toISOString() })),
      {
        entryToleranceMinutes: employee.schedule?.entryToleranceMinutes ?? 10,
        exitToleranceMinutes: employee.schedule?.exitToleranceMinutes ?? 10,
      },
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kairos Ponto';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Espelho de Ponto');

    // Cabeçalho
    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = 'Espelho de Ponto';
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:G2');
    sheet.getCell('A2').value = employee.tenant.name;
    sheet.getCell('A2').font = { size: 11, color: { argb: 'FF666666' } };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    // Info
    sheet.addRow([]);
    sheet.addRow(['Funcionário', employee.name]);
    sheet.addRow(['CPF', employee.cpf]);
    if (employee.registration) sheet.addRow(['Matrícula', employee.registration]);
    if (employee.department) sheet.addRow(['Departamento', employee.department.name]);
    if (employee.schedule) sheet.addRow(['Jornada', employee.schedule.name]);
    sheet.addRow(['Período', `${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`]);
    sheet.addRow([]);

    // Tabela
    const headerRow = sheet.addRow([
      'Data',
      'Previsto',
      'Trabalhado',
      'Atraso (min)',
      'H. Extra (min)',
      'Saldo (min)',
      'Status',
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      cell.border = { bottom: { style: 'thin' } };
    });

    for (const day of period.days.filter((d) => d.status !== 'REST_DAY')) {
      sheet.addRow([
        format(new Date(day.date + 'T12:00:00'), 'dd/MM/yyyy'),
        this.formatMin(day.expectedMinutes),
        this.formatMin(day.workedMinutes),
        day.lateMinutes || '-',
        day.overtimeMinutes || '-',
        day.balanceMinutes,
        day.status,
      ]);
    }

    // Total
    const totalRow = sheet.addRow([
      'TOTAL',
      this.formatMin(period.totals.expectedMinutes),
      this.formatMin(period.totals.workedMinutes),
      period.totals.debitMinutes,
      period.totals.overtimeMinutes,
      period.totals.balanceMinutes,
      `${period.totals.daysWorked}/${period.totals.daysWorked + period.totals.daysAbsent}`,
    ]);
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      cell.border = { top: { style: 'medium' } };
    });

    // Saldo acumulado
    sheet.addRow([]);
    const balanceRow = sheet.addRow(['Saldo Acumulado', this.formatMinSigned(period.totals.balanceMinutes)]);
    balanceRow.getCell(1).font = { size: 14, bold: true };

    // Ajusta largura das colunas
    sheet.columns.forEach((column) => {
      if (column.eachCell) {
        let maxLength = 10;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const cellLength = String(cell.value || '').length;
          if (cellLength > maxLength) maxLength = cellLength;
        });
        column.width = Math.min(maxLength + 2, 50);
      }
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  /**
   * Gera Excel com lista de registros de ponto (relatório de ocorrências).
   */
  async generateAttendanceLogExcel(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        timestamp: { gte: startDate, lte: endDate },
      },
      include: {
        employee: { select: { name: true, cpf: true } },
        location: { select: { name: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kairos Ponto';
    const sheet = workbook.addWorksheet('Registros de Ponto');

    sheet.columns = [
      { header: 'Data/Hora', key: 'timestamp', width: 20 },
      { header: 'Funcionário', key: 'employee', width: 30 },
      { header: 'CPF', key: 'cpf', width: 15 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Local', key: 'location', width: 20 },
      { header: 'Em geocerca', key: 'inGeofence', width: 12 },
      { header: 'Distância (m)', key: 'distance', width: 12 },
      { header: 'Face validada', key: 'faceValidated', width: 12 },
      { header: 'IP', key: 'ip', width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    for (const r of records) {
      sheet.addRow({
        timestamp: format(r.timestamp, 'dd/MM/yyyy HH:mm:ss'),
        employee: r.employee.name,
        cpf: r.employee.cpf,
        type: r.type,
        status: r.status,
        location: r.location?.name || '-',
        inGeofence: r.inGeofence ? 'Sim' : 'Não',
        distance: r.geofenceDistanceMeters?.toFixed(0) || '-',
        faceValidated: r.faceValidated ? 'Sim' : 'Não',
        ip: r.ip || '-',
      });
    }

    // Aplica zebra striping
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8F8F8' },
        };
      }
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  // --- helpers ---

  private formatMin(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private formatMinSigned(min: number): string {
    if (min === 0) return '00:00';
    const sign = min < 0 ? '-' : '+';
    return sign + this.formatMin(Math.abs(min));
  }
}
