<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->ulid('uuid')->unique();
            $table->string('reference', 30)->unique();
            $table->foreignId('merchant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('carrier_id')->constrained();
            $table->foreignId('carrier_service_id')->constrained();
            $table->string('type', 20)->default('outbound');
            $table->foreignId('parent_id')->nullable()->constrained('shipments')->nullOnDelete();
            $table->string('source', 20)->default('manual');
            $table->string('awb', 50)->nullable()->unique();
            $table->string('status', 30)->default('created');
            $table->string('order_number', 60)->nullable();
            $table->json('sender');
            $table->json('recipient');
            $table->foreignId('origin_city_id')->constrained('cities');
            $table->foreignId('destination_city_id')->constrained('cities');
            $table->string('zone', 20);
            $table->unsignedSmallInteger('pieces')->default(1);
            $table->decimal('weight_kg', 8, 2);
            $table->decimal('chargeable_weight_kg', 8, 2);
            $table->json('dimensions')->nullable();
            $table->string('contents')->nullable();
            $table->unsignedInteger('declared_value')->default(0);
            $table->unsignedInteger('cod_amount')->default(0)->comment('halalas');
            $table->string('cod_status', 20)->nullable();
            $table->foreignId('cod_settlement_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('cod_credited_at')->nullable();
            $table->unsignedInteger('carrier_cost')->default(0);
            $table->unsignedInteger('price')->default(0)->comment('excl. VAT');
            $table->unsignedInteger('vat')->default(0);
            $table->unsignedInteger('total')->default(0)->comment('charged to wallet');
            $table->json('price_breakdown')->nullable();
            $table->string('label_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('last_tracked_at')->nullable();
            $table->timestamps();
            $table->index(['merchant_id', 'status']);
            $table->index(['merchant_id', 'created_at']);
            $table->index(['status', 'last_tracked_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
