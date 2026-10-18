-- 5. Procedure para aprovação de cadastro

CREATE PROCEDURE dbo.sp_AprovarCadastro
    @SolicitacaoId INT,
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
            @Nome NVARCHAR(200),
            @Email NVARCHAR(320),
            @SenhaHash NVARCHAR(500),
            @Status NVARCHAR(20);

        -- Busca os dados da solicitação
        SELECT
            @Nome = Nome,
            @Email = Email,
            @SenhaHash = SenhaHash,
            @Status = Status
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

        -- Cria o usuário
        INSERT INTO dbo.usuario (
            Nome,
            Email,
            Senha
        )
        VALUES (
            @Nome,
            @Email,
            @SenhaHash
        );

        -- Atualiza o status da solicitação
        UPDATE dbo.SolicitacaoCadastro
        SET
            Status = 'Aprovada',
            DataAnalise = SYSUTCDATETIME(),
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