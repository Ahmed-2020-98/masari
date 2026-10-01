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
        Schema::create('merchant_rate_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('carrier_service_id')->constrained()->cascadeOnDelete();
            $table->string('markup_type', 10)->default('fixed');
            $table->unsignedInteger('markup_value');
            $table->timestamps();
            $table->unique(['merchant_id', 'carrier_service_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('merchant_rate_overrides');
    }
};
