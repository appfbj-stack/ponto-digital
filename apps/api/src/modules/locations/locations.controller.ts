import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@kairos/types';

@ApiTags('locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'EMPLOYEE')
  @ApiOperation({ summary: 'Listar locais de trabalho' })
  async list(@TenantId() tenantId: string) {
    return this.locationsService.list(tenantId);
  }

  @Get(':id')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.findById(tenantId, id);
  }

  @Post()
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateLocationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.locationsService.create(tenantId, dto, user.sub);
  }

  @Put(':id')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.locationsService.update(tenantId, id, dto, user.sub);
  }
}
