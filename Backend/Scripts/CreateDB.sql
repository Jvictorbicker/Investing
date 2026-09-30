USE master;
GO

/* ============================================================
   1. CRIAÇÃO DO BANCO
   ============================================================ */

IF NOT EXISTS (
    SELECT 1
    FROM sys.databases
    WHERE name = 'InvestifyDB'
)
BEGIN
    CREATE DATABASE InvestifyDB;
END
GO

USE InvestifyDB;
GO

/* ============================================================
   2. TABELA USUARIO
   ============================================================ */

IF OBJECT_ID('dbo.usuario', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuario
    (
        Id INT IDENTITY(1,1) NOT NULL,

        Nome NVARCHAR(150) NOT NULL,

        Email NVARCHAR(255) NOT NULL,

        Senha NVARCHAR(500) NOT NULL,

        Telefone NVARCHAR(30) NULL,

        FotoUrl NVARCHAR(500) NULL,

        CONSTRAINT PK_usuario
            PRIMARY KEY (Id),

        CONSTRAINT UQ_usuario_Email
            UNIQUE (Email)
    );
END
GO

/* ============================================================
   3. TABELA CARTEIRAS
   ============================================================ */

IF OBJECT_ID('dbo.carteiras', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.carteiras
    (
        Id BIGINT IDENTITY(1,1) NOT NULL,

        Nome NVARCHAR(150) NOT NULL,

        UsuarioId INT NOT NULL,

        CONSTRAINT PK_carteiras
            PRIMARY KEY (Id),

        CONSTRAINT FK_carteiras_usuario
            FOREIGN KEY (UsuarioId)
            REFERENCES dbo.usuario(Id)
            ON DELETE CASCADE
    );
END
GO

/* ============================================================
   4. TABELA ATIVOS
   ============================================================ */

IF OBJECT_ID('dbo.ativos', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ativos
    (
        Id BIGINT IDENTITY(1,1) NOT NULL,

        Ticker NVARCHAR(20) NOT NULL,

        PrecoCompra DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_ativos_PrecoCompra DEFAULT (0),

        Quantidade DECIMAL(18,4) NOT NULL
            CONSTRAINT DF_ativos_Quantidade DEFAULT (0),

        CarteiraId BIGINT NOT NULL,

        CONSTRAINT PK_ativos
            PRIMARY KEY (Id),

        CONSTRAINT FK_ativos_carteiras
            FOREIGN KEY (CarteiraId)
            REFERENCES dbo.carteiras(Id)
            ON DELETE CASCADE
    );
END
GO

/* ============================================================
   5. ÍNDICES
   ============================================================ */

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_carteiras_UsuarioId'
      AND object_id = OBJECT_ID('dbo.carteiras')
)
BEGIN
    CREATE INDEX IX_carteiras_UsuarioId
        ON dbo.carteiras(UsuarioId);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_ativos_CarteiraId'
      AND object_id = OBJECT_ID('dbo.ativos')
)
BEGIN
    CREATE INDEX IX_ativos_CarteiraId
        ON dbo.ativos(CarteiraId);
END
GO

/* ============================================================
   6. VERIFICAÇÃO
   ============================================================ */

USE InvestifyDB;
GO

SELECT
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO