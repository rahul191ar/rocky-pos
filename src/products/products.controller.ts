import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
  ValidationPipe,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiProperty
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, BarcodeParamDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class UpdateStockDto {
  @ApiProperty({
    description: 'New stock quantity',
    example: 50,
    minimum: 0
  })
  quantity: number;
}

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new product',
    description: 'Creates a new product in the inventory with all required details.'
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product successfully created',
    schema: {
      example: {
        id: 'cuid-product-123',
        name: 'iPhone 14',
        description: 'Latest iPhone model',
        sku: 'IPH14-128-BLK',
        barcode: '1234567890123',
        price: 999.99,
        costPrice: 799.99,
        quantity: 50,
        minQuantity: 5,
        categoryId: 'cuid-category-123',
        supplierId: 'cuid-supplier-123',
        isActive: true,
        createdAt: '2023-10-16T10:30:00.000Z',
        updatedAt: '2023-10-16T10:30:00.000Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: ['sku must be unique', 'price must be a positive number'],
        error: 'Bad Request'
      }
    }
  })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all products',
    description: 'Retrieves all products from the inventory with their category and supplier information.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products retrieved successfully',
    schema: {
      example: [
        {
          id: 'cuid-product-123',
          name: 'iPhone 14',
          sku: 'IPH14-128-BLK',
          price: 999.99,
          quantity: 50,
          isActive: true,
          category: {
            id: 'cuid-category-123',
            name: 'Electronics'
          },
          supplier: {
            id: 'cuid-supplier-123',
            name: 'Apple Inc.'
          }
        }
      ]
    }
  })
  findAll() {
    return this.productsService.findAll();
  }

  @Get('low-stock')
  @ApiOperation({ 
    summary: 'Get low stock products',
    description: 'Retrieves products that are below their minimum quantity threshold.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Low stock products retrieved successfully',
    schema: {
      example: [
        {
          id: 'cuid-product-123',
          name: 'iPhone 14',
          sku: 'IPH14-128-BLK',
          quantity: 2,
          minQuantity: 5,
          category: {
            name: 'Electronics'
          }
        }
      ]
    }
  })
  getLowStockProducts() {
    return this.productsService.getLowStockProducts();
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Search products',
    description: 'Search products by SKU or return all products if no SKU provided.'
  })
  @ApiQuery({ 
    name: 'sku', 
    required: false, 
    description: 'Product SKU to search for',
    example: 'IPH14-128-BLK'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully'
  })
  search(@Query('sku') sku?: string) {
    if (sku) {
      return this.productsService.findBySku(sku);
    }
    return this.productsService.findAll();
  }

  @Get('barcode/:code')
  @ApiOperation({ 
    summary: 'Find product by barcode',
    description: 'Retrieves a product using its barcode identifier.'
  })
  @ApiParam({ 
    name: 'code', 
    description: 'Product barcode',
    example: '1234567890123'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product found by barcode',
    schema: {
      example: {
        id: 'cuid-product-123',
        name: 'iPhone 14',
        barcode: '1234567890123',
        price: 999.99,
        quantity: 50
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Product not found',
        error: 'Not Found'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid barcode',
    schema: {
      example: {
        statusCode: 400,
        message: 'Barcode cannot be empty',
        error: 'Bad Request'
      }
    }
  })
  async findByBarcode(@Param('code', new ValidationPipe({ transform: true })) code: string) {
    if (!code || code.trim() === '') {
      throw new BadRequestException('Barcode cannot be empty');
    }
    return this.productsService.findByBarcode(code);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get product by ID',
    description: 'Retrieves a specific product by its unique identifier.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Product ID',
    example: 'cuid-product-123'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product retrieved successfully',
    schema: {
      example: {
        id: 'cuid-product-123',
        name: 'iPhone 14',
        description: 'Latest iPhone model',
        sku: 'IPH14-128-BLK',
        barcode: '1234567890123',
        price: 999.99,
        costPrice: 799.99,
        quantity: 50,
        minQuantity: 5,
        isActive: true,
        category: {
          id: 'cuid-category-123',
          name: 'Electronics'
        },
        supplier: {
          id: 'cuid-supplier-123',
          name: 'Apple Inc.'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found'
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update product',
    description: 'Updates an existing product with new information.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Product ID',
    example: 'cuid-product-123'
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found'
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/stock')
  @ApiOperation({ 
    summary: 'Update product stock',
    description: 'Updates the quantity of a specific product in inventory.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Product ID',
    example: 'cuid-product-123'
  })
  @ApiBody({ type: UpdateStockDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stock updated successfully',
    schema: {
      example: {
        id: 'cuid-product-123',
        name: 'iPhone 14',
        quantity: 75,
        message: 'Stock updated successfully'
      }
    }
  })
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { quantity: number },
  ) {
    return this.productsService.updateStock(id, body.quantity);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ 
    summary: 'Toggle product status',
    description: 'Activates or deactivates a product in the inventory.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Product ID',
    example: 'cuid-product-123'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product status toggled successfully',
    schema: {
      example: {
        id: 'cuid-product-123',
        isActive: false,
        message: 'Product status updated'
      }
    }
  })
  toggleStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.toggleProductStatus(id);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete product',
    description: 'Permanently removes a product from the inventory.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Product ID',
    example: 'cuid-product-123'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product deleted successfully',
    schema: {
      example: {
        message: 'Product deleted successfully'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found'
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
