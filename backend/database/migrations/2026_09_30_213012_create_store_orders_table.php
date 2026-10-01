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
        Schema::create('store_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_connection_id')->constrained()->cascadeOnDelete();
            $table->string('external_id');
            $table->string('number', 60);
            $table->json('customer');
            $table->json('items')->nullable();
            $table->unsignedInteger('total')->default(0);
            $table->string('payment_method', 30)->nullable();
            $table->unsignedInteger('cod_amount')->default(0);
            $table->decimal('weight_kg', 8, 2)->default(1);
            $table->string('status', 20)->default('pending');
            $table->foreignId('shipment_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('ordered_at')->nullable();
            $table->json('raw')->nullable();
            $table->timestamps();
            $table->unique(['store_connection_id', 'external_id']);
            $table->index(['merchant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_orders');
    }
};
