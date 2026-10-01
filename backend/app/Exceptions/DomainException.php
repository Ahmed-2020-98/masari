<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class DomainException extends Exception
{
    public function __construct(string $message, private string $errorCode = 'domain_error', private int $status = 422)
    {
        parent::__construct($message);
    }

    /**
     * Render the exception using the API error envelope.
     */
    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'code' => $this->errorCode,
            'errors' => (object) [],
        ], $this->status);
    }

    /**
     * Machine readable error code.
     */
    public function errorCode(): string
    {
        return $this->errorCode;
    }
}
