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
        Schema::create('carrier_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('carrier_service_id')->constrained()->cascadeOnDelete();
            $table->string('zone', 20);
            $table->decimal('base_weight_kg', 6, 2)->default(15);
            $table->unsignedInteger('base_price')->comment('cost in halalas, excl. VAT');
            $table->unsignedInteger('extra_kg_price')->comment('halalas per extra kg');
            $table->timestamps();
            $table->unique(['carrier_service_id', 'zone']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('carrier_rates');
    }
};
