CREATE   TRIGGER dbo.TR_SolicitacaoCadastro_Auditoria  
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