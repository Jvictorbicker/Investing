/* =====================================================================
   AtivoApi - Script completo do banco (SQL Server)
   Ordem: banco -> tabelas -> índices -> trigger -> procedures
   Pode rodar o script inteiro de uma vez (é idempotente nas tabelas).
   ===================================================================== */

-- 0. Banco de dados (ajuste o nome se quiser)
IF DB_ID(N'InvestifyDB') IS NULL
    CREATE DATABASE InvestifyDB;
GO

USE InvestifyDB;
GO

/* ---------------------------------------------------------------------
   1. Tabela usuario
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.usuario', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuario
    (
        Id        INT IDENTITY(1,1) NOT NULL,
        Nome      NVARCHAR(200)     NOT NULL,
        Email     NVARCHAR(320)     NOT NULL,
        Senha     NVARCHAR(500)     NOT NULL,
        Telefone  NVARCHAR(30)      NULL,
        FotoUrl   NVARCHAR(500)     NULL,
        IsAdmin   BIT               NOT NULL CONSTRAINT DF_usuario_IsAdmin DEFAULT (0),

        CONSTRAINT PK_usuario PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_usuario_Email UNIQUE (Email)
    );
END;
GO

/* ---------------------------------------------------------------------
   2. Tabela carteiras
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.carteiras', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.carteiras
    (
        Id         BIGINT IDENTITY(1,1) NOT NULL,
        Nome       NVARCHAR(200)        NOT NULL,
        UsuarioId  INT                  NOT NULL,

        CONSTRAINT PK_carteiras PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_carteiras_usuario
            FOREIGN KEY (UsuarioId) REFERENCES dbo.usuario (Id)
            ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_carteiras_UsuarioId
        ON dbo.carteiras (UsuarioId);
END;
GO

/* ---------------------------------------------------------------------
   3. Tabela ativos
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.ativos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ativos
    (
        Id           BIGINT IDENTITY(1,1) NOT NULL,
        Ticker       NVARCHAR(20)         NOT NULL,
        PrecoCompra  DECIMAL(18,2)        NOT NULL,
        Quantidade   DECIMAL(18,2)        NOT NULL,
        CarteiraId   BIGINT               NOT NULL,

        CONSTRAINT PK_ativos PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_ativos_carteiras
            FOREIGN KEY (CarteiraId) REFERENCES dbo.carteiras (Id)
            ON DELETE CASCADE,
        CONSTRAINT CK_ativos_PrecoCompra CHECK (PrecoCompra >= 0),
        CONSTRAINT CK_ativos_Quantidade  CHECK (Quantidade > 0)
    );

    CREATE NONCLUSTERED INDEX IX_ativos_CarteiraId
        ON dbo.ativos (CarteiraId);
END;
GO

/* ---------------------------------------------------------------------
   4. Tabela SolicitacaoCadastro
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.SolicitacaoCadastro', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SolicitacaoCadastro
    (
        Id               INT IDENTITY(1,1) NOT NULL,
        Nome             NVARCHAR(200)     NOT NULL,
        Email            NVARCHAR(320)     NOT NULL,
        SenhaHash        NVARCHAR(500)     NOT NULL,
        Status           NVARCHAR(20)      NOT NULL
            CONSTRAINT DF_SolicitacaoCadastro_Status DEFAULT (N'Pendente'),
        DataSolicitacao  DATETIME2(7)      NOT NULL
            CONSTRAINT DF_SolicitacaoCadastro_DataSolicitacao DEFAULT (SYSUTCDATETIME()),
        DataAnalise      DATETIME2(7)      NULL,
        AdministradorId  INT               NULL,

        CONSTRAINT PK_SolicitacaoCadastro PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_SolicitacaoCadastro_Administrador
            FOREIGN KEY (AdministradorId) REFERENCES dbo.usuario (Id),
        CONSTRAINT CK_SolicitacaoCadastro_Status
            CHECK (Status IN (N'Pendente', N'Aprovada', N'Rejeitada'))
    );

    CREATE NONCLUSTERED INDEX IX_SolicitacaoCadastro_Status
        ON dbo.SolicitacaoCadastro (Status)
        INCLUDE (Email, DataSolicitacao);

    CREATE NONCLUSTERED INDEX IX_SolicitacaoCadastro_Email
        ON dbo.SolicitacaoCadastro (Email);
END;
GO

/* ---------------------------------------------------------------------
   5. Tabela HistoricoSolicitacao (alimentada pela trigger de auditoria)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.HistoricoSolicitacao', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.HistoricoSolicitacao
    (
        Id               BIGINT IDENTITY(1,1) NOT NULL,
        SolicitacaoId    INT           NOT NULL,
        StatusAnterior   NVARCHAR(20)  NULL,      -- NULL quando é o INSERT inicial
        StatusNovo       NVARCHAR(20)  NOT NULL,
        AdministradorId  INT           NULL,
        DataAlteracao    DATETIME2(7)  NOT NULL
            CONSTRAINT DF_HistoricoSolicitacao_Data DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT PK_HistoricoSolicitacao PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_HistoricoSolicitacao_Solicitacao
            FOREIGN KEY (SolicitacaoId) REFERENCES dbo.SolicitacaoCadastro (Id),
        CONSTRAINT FK_HistoricoSolicitacao_Administrador
            FOREIGN KEY (AdministradorId) REFERENCES dbo.usuario (Id)
    );

    CREATE NONCLUSTERED INDEX IX_HistoricoSolicitacao_SolicitacaoId
        ON dbo.HistoricoSolicitacao (SolicitacaoId);
END;
GO

/* ---------------------------------------------------------------------
   6. Trigger de auditoria
   --------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER dbo.TR_SolicitacaoCadastro_Auditoria
ON dbo.SolicitacaoCadastro
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.HistoricoSolicitacao
        (SolicitacaoId, StatusAnterior, StatusNovo, AdministradorId)
    SELECT
        i.Id,
        d.Status,
        i.Status,
        i.AdministradorId
    FROM inserted i
    LEFT JOIN deleted d ON d.Id = i.Id
    WHERE d.Id IS NULL OR d.Status <> i.Status;
END;
GO

/* ---------------------------------------------------------------------
   7. Procedure para aprovação de cadastro
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_AprovarCadastro
    @SolicitacaoId   INT,
    @AdministradorId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Confirma que quem aprova é administrador
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.usuario
            WHERE Id = @AdministradorId
              AND IsAdmin = 1
        )
        BEGIN
            THROW 50001, 'Administrador inválido.', 1;
        END;

        DECLARE
            @Nome      NVARCHAR(200),
            @Email     NVARCHAR(320),
            @SenhaHash NVARCHAR(500),
            @Status    NVARCHAR(20);

        -- Busca os dados da solicitação
        SELECT
            @Nome      = Nome,
            @Email     = Email,
            @SenhaHash = SenhaHash,
            @Status    = Status
        FROM dbo.SolicitacaoCadastro WITH (UPDLOCK, HOLDLOCK)
        WHERE Id = @SolicitacaoId;

        -- Verifica se a solicitação existe
        IF @Status IS NULL
        BEGIN
            THROW 50002, 'Solicitação não encontrada.', 1;
        END;

        -- Verifica se a solicitação ainda está pendente
        IF @Status <> 'Pendente'
        BEGIN
            THROW 50003, 'A solicitação já foi analisada.', 1;
        END;

        -- Verifica se o e-mail já está cadastrado
        IF EXISTS (
            SELECT 1
            FROM dbo.usuario
            WHERE Email = @Email
        )
        BEGIN
            THROW 50004, 'Este e-mail já possui uma conta.', 1;
        END;

        -- Cria o usuário (IsAdmin assume 0 pelo DEFAULT)
        INSERT INTO dbo.usuario (Nome, Email, Senha)
        VALUES (@Nome, @Email, @SenhaHash);

        -- Atualiza o status da solicitação (dispara a trigger de auditoria)
        UPDATE dbo.SolicitacaoCadastro
        SET
            Status          = 'Aprovada',
            DataAnalise     = SYSUTCDATETIME(),
            AdministradorId = @AdministradorId
        WHERE Id = @SolicitacaoId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
        BEGIN
            ROLLBACK TRANSACTION;
        END;

        THROW;
    END CATCH;
END;
GO

/* ---------------------------------------------------------------------
   8. Procedure para rejeição de cadastro
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_RejeitarCadastro
    @SolicitacaoId   INT,
    @AdministradorId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Confirma que quem rejeita é administrador
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.usuario
            WHERE Id = @AdministradorId
              AND IsAdmin = 1
        )
        BEGIN
            THROW 50001, 'Administrador inválido.', 1;
        END;

        DECLARE @Status NVARCHAR(20);

        -- Busca o status da solicitação (trava a linha)
        SELECT @Status = Status
        FROM dbo.SolicitacaoCadastro WITH (UPDLOCK, HOLDLOCK)
        WHERE Id = @SolicitacaoId;

        -- Verifica se a solicitação existe
        IF @Status IS NULL
        BEGIN
            THROW 50002, 'Solicitação não encontrada.', 1;
        END;

        -- Verifica se a solicitação ainda está pendente
        IF @Status <> 'Pendente'
        BEGIN
            THROW 50003, 'A solicitação já foi analisada.', 1;
        END;

        -- Atualiza o status da solicitação (dispara a trigger de auditoria)
        UPDATE dbo.SolicitacaoCadastro
        SET
            Status          = 'Rejeitada',
            DataAnalise     = SYSUTCDATETIME(),
            AdministradorId = @AdministradorId
        WHERE Id = @SolicitacaoId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
        BEGIN
            ROLLBACK TRANSACTION;
        END;

        THROW;
    END CATCH;
END;
GO