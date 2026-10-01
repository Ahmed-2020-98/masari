<?php

namespace Tests\Feature\Http\Controllers\Api\Auth;

use App\Enums\MerchantRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedReferenceData();
    }

    public function test_otp_verified_registration_creates_owner_merchant_wallet_and_returns_token(): void
    {
        $this->postJson('/api/v1/auth/otp/send', ['phone' => '0551234567', 'purpose' => 'register'])
            ->assertOk()
            ->assertJsonPath('phone', '+966551234567');

        $verification = $this->postJson('/api/v1/auth/otp/verify', ['phone' => '0551234567', 'purpose' => 'register', 'code' => '1111'])
            ->assertOk()
            ->json('verification_token');

        $response = $this->postJson('/api/v1/auth/register', [
            'verification_token' => $verification,
            'phone' => '0551234567',
            'name' => 'نايف',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
            'store_name' => 'متجر تجريبي',
            'device_name' => 'iPhone 17',
            'platform' => 'ios',
        ])->assertCreated()->assertJsonStructure(['token', 'user' => ['id', 'phone']]);

        $user = User::query()->where('phone', '+966551234567')->firstOrFail();
        $merchant = $user->merchants()->firstOrFail();

        $this->assertSame(MerchantRole::Owner->value, $merchant->pivot->role);
        $this->assertSame(0, $merchant->wallet->balance);
        $this->assertNotNull($user->phone_verified_at);

        $this->withToken($response->json('token'))
            ->getJson('/api/v1/me/bootstrap')
            ->assertOk()
            ->assertJsonPath('merchant.store_name', 'متجر تجريبي')
            ->assertJsonPath('role.value', 'owner');
    }

    public function test_registration_without_verified_phone_returns_422(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'verification_token' => 'forged',
            'phone' => '0551234567',
            'name' => 'نايف',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
            'store_name' => 'متجر',
            'device_name' => 'web',
        ])->assertStatus(422)->assertJsonPath('code', 'verification_expired');

        $this->assertDatabaseMissing('users', ['phone' => '+966551234567']);
    }

    public function test_wrong_otp_code_returns_422_and_counts_attempt(): void
    {
        $this->postJson('/api/v1/auth/otp/send', ['phone' => '0551234567', 'purpose' => 'register'])->assertOk();

        $this->postJson('/api/v1/auth/otp/verify', ['phone' => '0551234567', 'purpose' => 'register', 'code' => '9999'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'رمز التحقق غير صحيح.');

        $this->assertDatabaseHas('otp_codes', ['phone' => '+966551234567', 'attempts' => 1]);
    }

    public function test_login_with_wrong_password_returns_401(): void
    {
        User::factory()->create(['phone' => '+966551234567']);

        $this->postJson('/api/v1/auth/login', ['phone' => '0551234567', 'password' => 'nope', 'device_name' => 'web'])
            ->assertUnauthorized()
            ->assertJsonPath('code', 'invalid_credentials');
    }

    public function test_merchant_cannot_log_into_admin_platform(): void
    {
        User::factory()->create(['phone' => '+966551234567']);

        $this->postJson('/api/v1/auth/login', ['phone' => '0551234567', 'password' => 'password123', 'device_name' => 'admin', 'platform' => 'admin'])
            ->assertForbidden()
            ->assertJsonPath('code', 'not_admin');
    }

    public function test_protected_endpoint_returns_401_envelope_without_token(): void
    {
        $this->getJson('/api/v1/me/bootstrap')
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'يرجى تسجيل الدخول للمتابعة.', 'code' => 'unauthenticated', 'errors' => []]);
    }
}
