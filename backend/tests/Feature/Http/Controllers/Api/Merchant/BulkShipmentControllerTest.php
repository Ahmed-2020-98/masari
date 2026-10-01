<?php

namespace Tests\Feature\Http\Controllers\Api\Merchant;

use App\Exports\BulkTemplateExport;
use App\Models\CarrierService;
use App\Models\Shipment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Maatwebsite\Excel\Facades\Excel;
use Tests\TestCase;

class BulkShipmentControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
        Storage::fake('local');
    }

    public function test_template_and_filtered_export_download_as_xlsx(): void
    {
        [$owner, $merchant] = $this->merchantWithOwner();
        Shipment::factory()->create(['merchant_id' => $merchant->id]);
        Sanctum::actingAs($owner);

        $this->get('/api/v1/merchant/shipments/bulk/template')->assertOk()->assertDownload('masari-bulk-template.xlsx');
        $this->get('/api/v1/merchant/shipments/export?filter[status]=created')->assertOk()->assertDownload();
    }

    public function test_preview_flags_invalid_rows_and_import_creates_valid_ones(): void
    {
        [$owner, $merchant] = $this->merchantWithOwner(500000);
        $sender = $this->senderAddress($merchant);
        $serviceId = CarrierService::query()->whereRelation('carrier', 'code', 'smsa')->value('id');
        Sanctum::actingAs($owner);

        $path = 'bulk-test.xlsx';
        Excel::store(new BulkTemplateExport, $path, 'local');
        $sheet = UploadedFile::fake()->createWithContent('bulk.xlsx', Storage::disk('local')->get($path));

        $preview = $this->postJson('/api/v1/merchant/shipments/bulk/preview', [
            'file' => $sheet,
            'carrier_service_id' => $serviceId,
            'sender_address_id' => $sender->id,
        ])->assertOk()->assertJsonPath('summary.rows', 2)->assertJsonPath('summary.valid', 2);

        $rows = collect($preview->json('data'))->map(fn (array $row) => [...$row, 'cod_amount' => $row['cod_amount']['amount']])->all();

        $this->postJson('/api/v1/merchant/shipments/bulk', [
            'carrier_service_id' => $serviceId,
            'sender_address_id' => $sender->id,
            'rows' => $rows,
        ])->assertOk()->assertJsonPath('created', 2)->assertJsonPath('failed', 0);

        $this->assertSame(2, $merchant->shipments()->where('source', 'bulk')->count());
        $this->assertSame(25000, $merchant->shipments()->where('order_number', '10045')->value('cod_amount'));
    }
}
